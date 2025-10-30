import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, image, isNewSession, userProfile } = await request.json();

    if (!message && !image) {
      return NextResponse.json(
        { error: 'Message or image is required' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Prepare payload for n8n webhook
    const payload: any = {
      chatInput: message || (image ? 'Please analyze this image and tell me what you see. What type of product is this and what manufacturing details can you identify?' : ''),
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      isNewSession: isNewSession || false,
      userProfile: userProfile || {}
    };

    // Create FormData for proper file upload
    const formData = new FormData();
    formData.append('chatInput', payload.chatInput);
    formData.append('sessionId', payload.sessionId);

    if (image) {
      // Convert base64 to actual File object (binary data)
      const base64Data = image.split(',')[1]; // Remove data:image/jpeg;base64, prefix
      const mimeType = image.split(',')[0].split(':')[1].split(';')[0]; // Extract mime type

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      // Create actual File object and append to FormData
      const file = new File([blob], 'uploaded_image.jpg', { type: mimeType });
      formData.append('files', file);
    }

    // Send as multipart/form-data (DO NOT set Content-Type header)
    const n8nResponse = await fetch(
      'https://glassfactory.app.n8n.cloud/webhook/129559da-251d-40c0-8247-26078bad8c3a/chat',
      {
        method: 'POST',
        body: formData, // FormData, not JSON
        // No headers - let browser set multipart/form-data automatically
      }
    );

    if (!n8nResponse.ok) {
      throw new Error(`n8n webhook responded with status: ${n8nResponse.status}`);
    }

    // Handle streaming response from n8n
    const responseText = await n8nResponse.text();
    
    // Parse the streaming response - extract content from "item" type responses
    let fullResponse = '';
    const lines = responseText.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const data = JSON.parse(line);
          if (data.type === 'item' && data.content) {
            fullResponse += data.content;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }
    
    console.log('n8n response received:', fullResponse.substring(0, 200) + '...');
    
    // Check if the response indicates image analysis occurred
    const imageAnalysisKeywords = ['image', 'picture', 'photo', 'visual', 'see', 'analyze', 'product', 'item'];
    const hasImageAnalysis = imageAnalysisKeywords.some(keyword => 
      fullResponse.toLowerCase().includes(keyword)
    );
    
    console.log('Response appears to include image analysis:', hasImageAnalysis);
    
    return NextResponse.json({
      response: fullResponse || 'Thank you for your message!',
      timestamp: new Date().toISOString(),
      imageProcessed: hasImageAnalysis && !!image
    });

  } catch (error) {
    console.error('Chat API error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to process chat message',
        response: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.'
      },
      { status: 500 }
    );
  }
}