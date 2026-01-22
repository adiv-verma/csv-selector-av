import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import pdf from 'pdf-parse';

// 1. Initialize Bedrock Client 
// Hardcoded to "us-east-1" (N. Virginia) to match where you likely enabled the model.
const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 2. Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const pdfText = data.text;

    // 3. Prepare Prompt for Bedrock (Claude 3 Haiku)
    // We use the Haiku model ID which is faster and cheaper
    const modelId = "anthropic.claude-3-haiku-20240307-v1:0";
    
    const prompt = `You are an expert CV reviewer and career coach. 
    Analyze the following resume text and provide:
    1. A summary of the candidate's strengths.
    2. Specific improvements for their bullet points (using STAR method).
    3. Missing keywords based on their apparent industry.
    4. A score out of 10.
    
    RESUME TEXT:
    ${pdfText}`;

    // Structure the payload for Claude 3
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ]
    };

    // 4. Invoke Bedrock
    const command = new InvokeModelCommand({
      contentType: "application/json",
      body: JSON.stringify(payload),
      modelId: modelId,
    });

    const apiResponse = await bedrock.send(command);
    
    // 5. Decode Response
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    const resultText = responseBody.content[0].text;

    return NextResponse.json({ analysis: resultText });

  } catch (error: any) {
    console.error('Detailed Bedrock Error:', error);
    
    // Return the specific error message to the frontend so you can see it
    return NextResponse.json(
      { error: error.message || 'Failed to analyze CV' }, 
      { status: 500 }
    );
  }
}
