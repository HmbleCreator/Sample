import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { createTRPCRouter, protectedProcedure } from '../trpc';

// Initialize Google Gemini
// Ensure the API key is loaded from your environment variables
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

// Model for text chat and understanding user-provided images.
const multiModalModel = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
});

// Model specifically for generating new images from a text prompt.
const imageGenerationModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-preview-image-generation',
});

export const chatRouter = createTRPCRouter({
  sendMessage: protectedProcedure
    .input(z.object({
      message: z.string(),
      conversationId: z.string().optional(),
      imageBase64: z.string().optional(),
      mimeType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { message, conversationId, imageBase64, mimeType } = input;
      
      if (!ctx.session?.user?.sub) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated or missing user ID' });
      }
      const userId = ctx.session.user.sub;

      let currentConversationId = conversationId;
      if (!currentConversationId) {
        console.log('Creating new conversation for user:', userId);
        const title = message.substring(0, 50);
        try {
          const { data: conversation, error } = await ctx.supabase
            .from('conversations')
            .insert({ user_id: userId, title: title })
            .select()
            .single();
          if (error) throw error;
          if (!conversation) throw new Error('No conversation data returned from Supabase after creation');
          currentConversationId = conversation.id;
        } catch (error) {
          console.error('Error in conversation creation logic:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create conversation', cause: error instanceof Error ? error : new Error(String(error)) });
        }
      }

      let aiResponseContent: string;
      let aiMessageType = 'text';
      let userMessageType = 'text';

      try {
        const isImageGenerationRequest = message.trim().toLowerCase().startsWith('/image');
        const hasUploadedImage = !!(imageBase64 && mimeType);

        if (isImageGenerationRequest) {
          // Case 1: User wants to generate an image with `/image`
          const prompt = message.replace(/^\/image\s*/i, '').trim();
          console.log(`Generating image for prompt: "${prompt}"`);
          
          try {
            // Direct REST API call to Gemini 2.0 Flash Image Generation model
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`;
            
            const requestBody = {
              contents: [{
                role: 'user',
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"]
              }
            };

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`API request failed with status ${response.status}: ${JSON.stringify(errorData)}`);
            }

            const responseData = await response.json();
            console.log('Image generation response:', JSON.stringify(responseData, null, 2));
            
            // Extract the image data from the response
            const imagePart = responseData.candidates?.[0]?.content?.parts?.find(
              (part: any) => part.inlineData?.mimeType?.startsWith('image/')
            );

            if (imagePart?.inlineData) {
              const { mimeType, data } = imagePart.inlineData;
              aiResponseContent = `data:${mimeType};base64,${data}`;
              aiMessageType = 'image';
              console.log('Successfully generated image with mimeType:', mimeType);
            } else {
              // Check if there's any text content that might contain base64 data
              const textContent = responseData.candidates?.[0]?.content?.parts?.find(
                (part: any) => part.text
              )?.text;
              
              // If the text content looks like base64 data, try to format it as an image
              if (textContent && textContent.length > 1000 && /^[A-Za-z0-9+/=]+$/.test(textContent.trim())) {
                console.log('Found base64-like content in text response, formatting as image');
                aiResponseContent = `data:image/png;base64,${textContent.trim()}`;
                aiMessageType = 'image';
              } else {
                console.error('Image generation failed. Response:', JSON.stringify(responseData, null, 2));
                aiResponseContent = textContent || "I was unable to generate an image. The prompt may have been rejected. Please try again with a different prompt.";
                aiMessageType = 'text';
              }
            }
          } catch (error) {
            console.error('Image generation error:', error);
            // Fallback to text response if image generation fails
            const fallbackResult = await multiModalModel.generateContent(
              `I'm unable to generate an image right now. Here's a response to your prompt: ${prompt}`
            );
            const fallbackResponse = await fallbackResult.response;
            aiResponseContent = fallbackResponse.text();
            aiMessageType = 'text';
          }
          userMessageType = 'image_prompt';

        } else if (hasUploadedImage) {
          // Case 2: User uploaded an image and asked a question about it
          // Use gemini-2.5-flash for image understanding and Q&A
          console.log(`Generating response for prompt over image: "${message}"`);
          const prompt = message;
          const imagePart: Part = {
            inlineData: { data: imageBase64, mimeType: mimeType },
          };
          const result = await multiModalModel.generateContent([prompt, imagePart]);
          const response = await result.response;
          aiResponseContent = response.text();
          aiMessageType = 'text';
          userMessageType = 'image_query';

        } else {
          // Case 3: Standard text-only message
          // Retrieve conversation history for context
          let conversationHistory: any[] = [];
          if (currentConversationId) {
            const { data: messages, error } = await ctx.supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', currentConversationId)
              .eq('user_id', userId)
              .order('created_at', { ascending: true })
              .limit(20); // Limit to last 20 messages to avoid token limits
            
            if (!error && messages) {
              conversationHistory = messages;
            }
          }

          // Build conversation context for AI
          const conversationParts = [];
          
          // Add conversation history
          for (const msg of conversationHistory) {
            if (msg.message_type === 'text') {
              conversationParts.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
              });
            }
          }
          
          // Add current user message
          conversationParts.push({
            role: 'user',
            parts: [{ text: message }]
          });

          console.log(`Generating response with ${conversationHistory.length} previous messages for context`);
          
          // Use gemini-2.5-flash for text chat with conversation history
          const result = await multiModalModel.generateContent({
            contents: conversationParts
          });
          const response = await result.response;
          aiResponseContent = response.text();
          aiMessageType = 'text';
          userMessageType = 'text';
        }
      } catch (error) {
        console.error('Error generating AI response:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to generate AI response', cause: error });
      }

      // --- Save messages to database ---
      try {
        await ctx.supabase.from('messages').insert({
          content: message,
          role: 'user',
          message_type: userMessageType,
          user_id: userId,
          conversation_id: currentConversationId,
        });

        const { data: aiMessage, error: aiMessageError } = await ctx.supabase.from('messages').insert({
          content: aiResponseContent,
          role: 'assistant',
          message_type: aiMessageType,
          user_id: userId,
          conversation_id: currentConversationId,
        }).select().single();

        if (aiMessageError) throw aiMessageError;

        return { aiMessage, conversationId: currentConversationId };
      } catch(error) {
        console.error('Error saving messages to Supabase:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to save messages to the database.', cause: error });
      }
    }),

  getConversations: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.sub) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated or missing user ID' });
      }
      const userId = ctx.session.user.sub;
      const { data: conversations, error } = await ctx.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching conversations:", error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not fetch conversations.'});
      }
      return conversations || [];
    }),

  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const { conversationId } = input;
      if (!ctx.session?.user?.sub) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not authenticated or missing user ID' });
      }
      const userId = ctx.session.user.sub;
      const { data: messages, error } = await ctx.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (error) {
        console.error("Error fetching messages:", error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Could not fetch messages.'});
      }
      return messages || [];
    }),
});