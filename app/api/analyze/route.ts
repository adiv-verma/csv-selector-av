import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import pdf from 'pdf-parse';

// --- CREDENTIALS SETUP ---
// We use the "!" to tell TypeScript we are sure these variables exist
const accessKeyId = process.env.AMPLIFY_BEDROCK_ID;
const secretAccessKey = process.env.AMPLIFY_BEDROCK_SECRET;

const bedrock = new BedrockRuntimeClient({
  region: "us-east-1",
  credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const pdfText = data.text;

    // Use Claude 3 Haiku
    const modelId = "anthropic.claude-3-haiku-20240307-v1:0";
    
    // --- THE PROMPT THAT CREATES THE DESIGN DATA ---
    const prompt = `You are a strict data extraction AI. Analyze this resume text and extract data into a valid JSON format only. Do not add any conversational text.

    Resume Text:
    ${pdfText}

    Output Format (JSON):
    {
      "candidateName": "Extract full name",
      "yearsOfExperience": "Extract total years (e.g., '10.5 Years')",
      "matchScore": number (0-100 overall score),
      "decision": "CONSIDER" or "REJECT",
      "summary": "One sentence summary of strengths and weaknesses.",
      "skills": [
        {
          "name": "Wireless Networks (5G, 4G, LTE)",
          "weight": "4/5",
          "evidence": "Extract specific evidence from CV or state 'No explicit experience found'",
          "proficiency": number (0-100),
          "score": number (0-100)
        },
        {
          "name": "Fixed Networks (Fiber)",
          "weight": "4/5",
          "evidence": "Extract specific evidence...",
          "proficiency": number (0-100),
          "score": number (0-100)
        },
        {
          "name": "OSS",
          "weight": "4/5",
          "evidence": "Extract specific evidence...",
          "proficiency": number (0-100),
          "score": number (0-100)
        },
        {
          "name": "Service Assurance",
          "weight": "4/5",
          "evidence": "Extract specific evidence...",
          "proficiency": number (0-100),
          "score": number (0-100)
        }
      ]
    }`;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }]
        }
      ]
    };

    const command = new InvokeModelCommand({
      contentType: "application/json",
      body: JSON.stringify(payload),
      modelId: modelId,
    });

    const apiResponse = await bedrock.send(command);
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    
    // Parse the JSON string inside the text response
    let resultText = responseBody.content[0].text;
    
    // Cleanup if the model adds markdown code blocks
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '');
    const jsonAnalysis = JSON.parse(resultText);

    return NextResponse.json(jsonAnalysis);

  } catch (error: any) {
    console.error('FINAL ERROR:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze CV' }, 
      { status: 500 }
    );
  }
}
