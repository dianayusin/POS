
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "./types.ts";

export const getSalesInsights = async (transactions: Transaction[]) => {
  if (!process.env.API_KEY) {
    return "💡 提示：請設定 API_KEY 以啟用 AI 分析。";
  }
  
  if (transactions.length === 0) {
    return "目前尚無銷售紀錄可供分析。";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const summary = transactions.slice(0, 10).map(t => ({
    total: t.total,
    items: t.items.map(i => `${i.name}x${i.quantity}`).join(", "),
    time: new Date(t.timestamp).toLocaleTimeString()
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一位資深餐飲顧問。請根據以下最近的交易紀錄，提供一段簡短且具啟發性的經營建議（約 50 字）：\n${JSON.stringify(summary)}`,
    });
    return response.text;
  } catch (error) {
    return "AI 分析暫時無法連接。";
  }
};
