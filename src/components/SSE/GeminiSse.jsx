// src/App.js (React 元件部分)

import React, { useState } from "react";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
import MDEditor from "@uiw/react-md-editor";
import { Button, Col, Input, Row, Space } from "antd";

const API_URL = "http://localhost:3000/sse/stream";

export default function GeminiSSe() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("閒置");
  const [isLoading, setIsLoading] = useState(false);
  // --- 📢 新增：定義一個會話 ID ---
  const [sessionId] = useState(`user-${Date.now()}`); // 使用 Date.now() 簡單模擬一個唯一 ID

  // --- 📢 新增：顧問選擇狀態 ---
  const [consultantId, setConsultantId] = useState("financial_advisor");

  // 定義顧問選項 (與 consultantConfig.js 中的 ID 保持一致)
  const advisorOptions = [
    { id: "financial_advisor", name: "財務顧問" },
    { id: "insurance_advisor", name: "保單顧問" },
    { id: "jpmorgan_analyst", name: "摩根大通分析師 (台美股)" }, // <--- 新增
  ];

  // 處理按鈕點擊和串流邏輯
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("請輸入您的提示 (Prompt)");
      return;
    }

    // 重設狀態
    setResponse("");
    setStatus("連線中...");
    setIsLoading(true);

    try {
      // 1. 發送 POST 請求

      const fetchResponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          prompt,
          sessionId, // 傳送會話 ID
          consultantId,
        }),
      });
      console.log(fetchResponse);
      if (!fetchResponse.ok) {
        throw new Error(`HTTP 錯誤! 狀態碼: ${fetchResponse.status}`);
      }

      // 2. 獲取回應串流
      const reader = fetchResponse.body
        .pipeThrough(new TextDecoderStream()) // 將 Byte 轉換為文字
        .getReader();

      let currentResponseText = "";

      // 3. 逐塊讀取並解析 SSE 數據
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setStatus("🟢 串流完成");
          break;
        }

        // 處理 SSE 格式的數據塊 (data: [內容]\n\n)
        const lines = value.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const rawData = line.substring(6);
              const data = JSON.parse(rawData);

              if (data.type === "text") {
                // 即時更新文字
                currentResponseText += data.content;
                setResponse(currentResponseText);
              } else if (data.type === "end") {
                setStatus("🟢 串流完成");
                reader.cancel(); // 結束串流
                return;
              } else if (data.type === "error") {
                setStatus("🔴 串流錯誤");
                setResponse((prev) => prev + `\n[錯誤: ${data.message}]`);
                reader.cancel(); // 結束串流
                return;
              }
            } catch (e) {
              console.error("解析 JSON 錯誤:", e, "原始資料:", line);
            }
          }
        }
        setStatus("✨ 正在生成...");
      }
    } catch (error) {
      console.error("串流連線失敗:", error);
      setStatus("🔴 連線失敗");
      setResponse((prev) => prev + `\n[連線錯誤: ${error.message}]`);
    } finally {
      setIsLoading(false);
    }
  };

  // 元件的渲染部分
  return (
    <div style={{ fontFamily: "Arial", margin: "auto" }}>
      <span style={{ fontSize: "32px", fontWeight: "bold" }}>串流聊天 Demo (POST + SSE)</span>
      <div style={{ marginBottom: "15px" }}>
        <label>
          選擇顧問:
          <select
            value={consultantId}
            onChange={(e) => {
              setConsultantId(e.target.value);
              setResponse(""); // 切換顧問時清空對話紀錄
              // 實際應用中，您可能需要重設 sessionId 或發送一個重設指令給後端
            }}
            disabled={isLoading}
            style={{ marginLeft: "10px", padding: "5px" }}
          >
            {advisorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p>
        狀態: <b style={{ color: isLoading ? "blue" : status.includes("🟢") ? "green" : "red" }}>{status}</b>
      </p>
      <Row>
        <Col span={24} style={{ maxHeight: 750 }}>
          <MDEditor
            value={response}
            preview="preview" // 只顯示預覽
            height={750}
          />
        </Col>
        <Col span={24}>
          <Space.Compact block>
            <Input.TextArea
              allowClear
              autoSize={{ minRows: 5, maxRows: 5 }}
              placeholder="請輸入您想問 AI 的問題..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
            />
            <Button type="primary" onClick={handleGenerate} disabled={isLoading} style={{ height: "auto" }}>
              {isLoading ? "AI 正在思考..." : "點擊開始生成"}
            </Button>
          </Space.Compact>
        </Col>
      </Row>
    </div>
  );
}
