import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import pdf from 'pdf-parse';

// Initialize Bedrock Client (Region defaults to your AWS config, usually us-east-1 or us-west-2)
const bedrock = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const pdfText = data.text;

    // 2. Prepare Prompt for Bedrock
    // We use Claude 3 Sonnet model ID: anthropic.claude-3-sonnet-20240229-v1:0
    const modelId = "anthropic.claude-3-sonnet-20240229-v1:0";
    
    const prompt = `You are an expert CV reviewer and career coach. 
    Analyze the following resume text and provide:
    1. A summary of the candidate's strengths.
    2. Specific improvements for their bullet points (using STAR method).
    3. Missing keywords based on their apparent industry.
    4. A score out of 10.
    
    RESUME TEXT:
    ${pdfText}`;

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

    // 3. Invoke Bedrock
    const command = new InvokeModelCommand({
      contentType: "application/json",
      body: JSON.stringify(payload),
      modelId: modelId,
    });

    const apiResponse = await bedrock.send(command);
    
    // 4. Decode Response
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    const resultText = responseBody.content[0].text;

    return NextResponse.json({ analysis: resultText });

  } catch (error) {
    console.error('Error processing CV:', error);
    return NextResponse.json(
      { error: 'Failed to analyze CV. Ensure your Amplify role has Bedrock access.' }, 
      { status: 500 }
    );
  }
}
