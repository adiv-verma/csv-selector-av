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

// Helper to clean JSON
function extractJson(text: string) {
  try {
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return text.substring(startIndex, endIndex + 1);
    }
    return text;
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

    // 1. Parse PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const pdfText = data.text;

    // 2. Parse User Defined Skills
    let skillsPrompt = "";
    let userSkills: any[] = [];
    
    if (skillsJson) {
      userSkills = JSON.parse(skillsJson);
      skillsPrompt = userSkills.map((s: any) => `- ${s.name} (Importance Weight: ${s.weight})`).join('\n');
    }

    // 3. Prompt for Bedrock
    const modelId = "anthropic.claude-3-haiku-20240307-v1:0";
    
    const prompt = `You are a strict data extraction AI. 
    Analyze the resume below against these SPECIFIC required skills:
    ${skillsPrompt}

    Instructions:
    1. For each skill, extract "evidence" and give a score (0-100).
    2. If evidence is weak or missing, the score MUST be low (0-30).
    3. Do NOT calculate the final matchScore. I will do that.
    4. Return ONLY JSON.

    Resume Text:
    ${pdfText}

    JSON Format:
    {
      "candidateName": "Full Name",
      "yearsOfExperience": "Total Years",
      "summary": "1 sentence summary.",
      "skills": [
        {
          "name": "Exact Skill Name from list",
          "evidence": "Evidence found",
          "proficiency": 0,
          "score": 0
        }
      ]
    }`;

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

    // 4. Get AI Response
    const apiResponse = await bedrock.send(command);
    const decodedResponseBody = new TextDecoder().decode(apiResponse.body);
    const responseBody = JSON.parse(decodedResponseBody);
    let resultText = responseBody.content[0].text;
    
    // Clean and Parse JSON
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '');
    const cleanJsonString = extractJson(resultText);
    const jsonAnalysis = JSON.parse(cleanJsonString);

    // --- 5. THE FIX: MATHEMATICAL SCORING ---
    // We calculate the weighted average ourselves to ensure the total matches the parts.
    
    let totalWeightedScore = 0;
    let totalMaxWeight = 0;

    // Map the AI results back to the user's weights
    // (AI might mess up the name slightly, so we try to match loosely)
    const processedSkills = jsonAnalysis.skills.map((aiSkill: any) => {
        // Find the weight user assigned to this skill
        const matchedUserSkill = userSkills.find((us: any) => 
            aiSkill.name.toLowerCase().includes(us.name.toLowerCase()) || 
            us.name.toLowerCase().includes(aiSkill.name.toLowerCase())
        );

        const weight = matchedUserSkill ? matchedUserSkill.weight : 1; // Default to 1 if not found
        const score = aiSkill.score || 0;

        totalWeightedScore += (score * weight);
        totalMaxWeight += (100 * weight);

        return {
            ...aiSkill,
            weight: weight // Ensure weight is sent back to frontend
        };
    });

    // Calculate final percentage
    const calculatedMatchScore = totalMaxWeight > 0 
        ? Math.round((totalWeightedScore / totalMaxWeight) * 100) 
        : 0;

    // Determine Decision based on strict math
    let decision = "REJECT";
    if (calculatedMatchScore >= 80) decision = "RECOMMENDED";
    else if (calculatedMatchScore >= 50) decision = "CONSIDER";

    // Overwrite the AI's hallucinations with our Math
    const finalResponse = {
        ...jsonAnalysis,
        skills: processedSkills,
        matchScore: calculatedMatchScore,
        decision: decision
    };

    return NextResponse.json(finalResponse);

  } catch (error: any) {
    console.error('Analysis Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
