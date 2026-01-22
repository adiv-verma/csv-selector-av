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

// --- HELPER TO CLEAN JSON ---
function extractJson(text: string) {
  try {
    // 1. Try to find the first '{' and the last '}'
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return text.substring(startIndex, endIndex + 1);
    }
    return text; // Return original if no brackets found (will likely fail parsing)
  } catch (e) {
    return text;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const skillsJson = formData.get('skills') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const pdfText = data.text;

    // Parse Skills
    let skillsPrompt = "";
    if (skillsJson) {
      const skills = JSON.parse(skillsJson);
      skillsPrompt = skills.map((s: any) => `- ${s.name} (Importance: ${s.weight}/5)`).join('\n');
    }

    // Use Claude 3 Haiku
    const modelId = "anthropic.claude-3-haiku-20240307-v1:0";
    
    const prompt = `You are a bulk CV screening AI. 
    Analyze the resume below against these required skills:
    ${skillsPrompt}

    Return ONLY raw JSON. No markdown formatting, no code blocks, no intro text.
    Ensure all numbers are integers (e.g. 85, not 85.5).
    
    JSON Format:
    {
      "candidateName": "Full Name",
      "yearsOfExperience": "Total Years",
      "matchScore": 0,
      "decision": "RECOMMENDED",
      "summary": "1 sentence summary.",
      "skills": [
        {
          "name": "Skill Name",
          "evidence": "Evidence found",
          "proficiency": 0,
          "score": 0
        }
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
    
    // --- ROBUST CLEANING ---
    // 1. Remove markdown code blocks
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '');
    
    // 2. Extract only the JSON part
    const cleanJsonString = extractJson(resultText);

    // 3. Parse
    const jsonAnalysis = JSON.parse(cleanJsonString);

    return NextResponse.json(jsonAnalysis);

  } catch (error: any) {
    console.error('Analysis Error:', error);
    // Return the specific error so we can see it in the frontend logs
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
