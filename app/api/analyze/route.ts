import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import pdf from 'pdf-parse';

// --- CREDENTIALS SETUP ---
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
    const skillsJson = formData.get('skills') as string; // Read custom skills

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const pdfText = data.text;

    // Parse Skills to insert into prompt
    let skillsPrompt = "";
    if (skillsJson) {
      const skills = JSON.parse(skillsJson);
      skillsPrompt = skills.map((s: any) => `- ${s.name} (Importance: ${s.weight}/5)`).join('\n');
    }

    // Use Claude 3 Haiku
    const modelId = "anthropic.claude-3-haiku-20240307-v1:0";
    
    // --- DYNAMIC PROMPT ---
    const prompt = `You are a bulk CV screening AI. 
    
    1. Analyze the resume below against these SPECIFIC required skills:
    ${skillsPrompt}

    2. Extract data into this JSON format only:
    {
      "candidateName": "Full Name",
      "yearsOfExperience": "Total Years (e.g., 5.5 Years)",
      "matchScore": number (0-100 based on the weighted skills),
      "decision": "RECOMMENDED" (if score > 80), "CONSIDER" (if score > 50), or "REJECT",
      "summary": "1 sentence summary.",
      "skills": [
        {
          "name": "Skill Name from my list",
          "weight": "Importance level",
          "evidence": "1 short sentence of proof",
          "proficiency": number (0-100),
          "score": number (0-100)
        }
        // ... repeat for all provided skills
      ]
    }

    RESUME TEXT:
    ${pdfText}`;

    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 4000,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }]
    };

    const command = new InvokeModelCommand({
      contentType: "application/json",
      body: JSON.stringify(payload),
      modelId: modelId,
    });

    const apiResponse = await bedrock.send(command);
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    let resultText = responseBody.content[0].text;
    
    // Cleanup JSON
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '');
    const jsonAnalysis = JSON.parse(resultText);

    return NextResponse.json(jsonAnalysis);

  } catch (error: any) {
    console.error('FINAL ERROR:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
