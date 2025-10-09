// src/App.js (React 元件部分)

import React, { useEffect, useRef, useState } from "react";
import { Button, Col, Input, Row, Select, Space } from "antd";
import dayjs from "dayjs";
import ChatMessage from "./ChatMessage";
import axios from "axios";

const API_URL = process.env.REACT_APP_URL + "/sse/stream";

export default function GeminiSSe() {
  const bottomRef = useRef(null);
  const [isFirst, setIsFirst] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("閒置");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistory, setIsHistory] = useState([]);
  const [isModel, setIsModel] = useState([]);
  // --- 📢 新增：定義一個會話 ID ---
  const [isOptions, setIsOptions] = useState([]);
  const [sessionId, setSessionId] = useState(`user-${Date.now()}`); // 使用 Date.now() 簡單模擬一個唯一 ID
  // "user-1759808269118" 台積電
  // "user-1759823761041" PCB
  // "user-1759824515107" 測試對話1

  // --- 📢 新增：顧問選擇狀態 ---
  const [consultantId, setConsultantId] = useState("financial_advisor");

  // 切換不同聊天室
  const handleChangeChatBox = async (v) => {
    setSessionId(v);
    // 假設您的 Express 後端運行在 3000 埠
    const historyApiUrl = process.env.REACT_APP_URL + `/api/history`;

    try {
      const response = await fetch(historyApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: v }),
      });

      if (response.status === 444) {
        console.log("新的對話，沒有歷史紀錄。");
        return [];
      }

      if (!response.ok) {
        throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
      }

      const data = await response.json();

      // 返回格式化後的歷史訊息陣列，您可以用它來顯示在聊天介面上
      console.log(data.history);
      setIsHistory(data.history);

      return data.history;
    } catch (error) {
      console.error("獲取歷史紀錄失敗:", error);
      return [];
    }
  };

  // 呼叫這個空元素的 scrollIntoView() 方法
  const scrollToBottom = () => {
    const scrollHeight = bottomRef.current.scrollHeight;
    const offsetHeight = bottomRef.current.offsetHeight;
    bottomRef.current?.scrollTo({
      top: scrollHeight - offsetHeight,
      behavior: "smooth",
    });
  };

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
      // SSE響應成功 清除input數據
      setIsHistory((initRecord) => [
        ...initRecord,
        { role: "user", content: prompt, timestamp: dayjs().format("YYYY-MM-DD HH:mm:ss") },
        { role: "modal", content: "" },
      ]);
      setPrompt("");

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
              } else if (data.type === "finial") {
                setStatus("🟢 串流完成");
                reader.cancel(); // 結束串流
                setResponse(currentResponseText + "串流完成");
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

  useEffect(() => {
    if (response.length >= 1) {
      if (response.endsWith("串流完成")) {
        setResponse("");
      } else {
        setIsHistory((initRecord) => {
          return initRecord.map((item, index) => {
            const length = initRecord.length - 1;
            if (index === length && length > 0)
              return { ...item, content: response, timestamp: !item?.timestamp ? dayjs().format("YYYY-MM-DD HH:mm:ss") : item.timestamp };
            return item;
          });
        });
      }
    }
  }, [response]);

  useEffect(() => {
    if ((process.env.NODE_ENV === "development" && isFirst) || process.env.NODE_ENV === "production") {
      setIsFirst(false);
    }
    if (!isFirst) {
      const fetchModal = async () => {
        try {
          // R (Read): 讀取所有顧問配置
          const response = await axios.get(process.env.REACT_APP_URL + "/api/config");
          console.log();
          const isModelData = response?.data?.map((item) => ({ label: item.name, value: item.consultantId }));

          setIsModel(isModelData);
        } catch (error) {
          console.error("Fetch error:", error);
        }
      };
      const fetchAllSessionId = async () => {
        const historyApiUrl = process.env.REACT_APP_URL + `/api/records/all`;

        try {
          // const sessionId = "user-1759808269118";
          const response = await fetch(historyApiUrl);

          if (!response.ok) {
            throw new Error(`HTTP 錯誤! 狀態: ${response.status}`);
          }

          const data = await response.json();

          // 返回格式化後的歷史訊息陣列，您可以用它來顯示在聊天介面上
          console.log(data);
          setIsOptions(data?.records);
        } catch (error) {
          console.error("獲取歷史紀錄失敗:", error);
          return [];
        }
      };
      fetchAllSessionId();
      fetchModal();
    }
  }, [isFirst]);

  // 元件的渲染部分
  return (
    <div style={{ fontFamily: "Arial", margin: "auto" }}>
      <Row>
        <Col span={24} style={{ display: "flex" }}>
          <Select options={isModel} value={consultantId} onChange={(v) => setConsultantId(v)} style={{ minWidth: 250, display: "flex" }} />
          <Select
            options={isOptions}
            value={sessionId}
            onChange={(v) => handleChangeChatBox(v)}
            style={{ minWidth: 250, display: "flex" }}
          />
          <Button onClick={scrollToBottom}>測試</Button>
        </Col>
        <Col span={24}>
          <p>
            狀態: <b style={{ color: isLoading ? "blue" : status.includes("🟢") ? "green" : "red" }}>{status}</b>
          </p>
        </Col>

        <Col
          ref={bottomRef}
          span={24}
          style={{ minHeight: 750, maxHeight: 750, padding: "10px", overflow: "auto", border: "1px solid gray", borderRadius: "10px" }}
        >
          {isHistory?.map((item, index) => {
            return (
              <React.Fragment key={item?.timestamp + "_" + index}>
                <ChatMessage role={item.role} content={item.content} />
              </React.Fragment>
            );
          })}
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
