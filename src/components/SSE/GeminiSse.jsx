// src/App.js (React 元件部分)

import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Col, Input, Menu, Row, Space } from "antd";
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

  const [isModel, setIsModel] = useState({ init: [], select: [] });
  // --- 📢 新增：定義一個會話 ID ---
  const [isOptions, setIsOptions] = useState([]);
  const [sessionId, setSessionId] = useState(`user-${Date.now()}`); // 使用 Date.now() 簡單模擬一個唯一 ID
  // --- 📢 新增：顧問選擇狀態 ---
  const [consultantId, setConsultantId] = useState("");

  // 切換model
  const handleChangeModel = async (v) => {
    setConsultantId(v);
    const historyApiUrl = process.env.REACT_APP_URL + `/api/records/all`;

    try {
      // const sessionId = "user-1759808269118";
      const response = await fetch(historyApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: v }),
      });

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
  // 清空model
  const handleCancelModel = () => {
    setConsultantId("");
    setIsHistory([]);
  };

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
        scrollToBottom();
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
          const isModelData = response?.data?.map((item) => ({ label: item.name, value: item.consultantId }));
          setIsModel({ init: response?.data, select: isModelData });
        } catch (error) {
          console.error("Fetch error:", error);
        }
      };
      fetchModal();
    }
  }, [isFirst]);

  // 元件的渲染部分
  return (
    <div style={{ fontFamily: "Arial", margin: "auto" }}>
      {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "28px", fontWeight: "bold" }}>
          當前模型：{isModel?.init?.find((item) => item.consultantId === consultantId)?.name}
        </span>
      </div> */}
      {!consultantId ? (
        <Row gutter={[12, 12]}>
          {isModel.init?.map((item) => {
            return (
              <Col span={8} key={item.consultantId} style={{ height: "100%" }}>
                <Card title={item.name + "模型"} variant="borderless">
                  <p>{item?.topicScope?.join("、")}</p>
                  <Button block type="primary" onClick={() => handleChangeModel(item.consultantId)}>
                    使用模型
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        <Row gutter={[0, 12]} style={{ overflow: "hidden" }}>
          <Col flex="0 1 250px" style={{ paddingRight: "6px" }}>
            <Menu
              style={{ minHeight: "calc(100vh - 62px)" }}
              mode="inline"
              theme="dark"
              items={[
                {
                  key: "back",
                  label: (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>
                        狀態: <b style={{ color: isLoading ? "blue" : status.includes("🟢") ? "green" : "red" }}>{status}</b>
                      </span>
                      <Button type="primary" onClick={handleCancelModel}>
                        返回
                      </Button>
                    </div>
                  ),
                },
                ...isOptions,
              ]}
              onClick={(item) => (item.key !== "back" ? handleChangeChatBox(item.key) : null)}
            />
          </Col>
          <Col flex="auto" style={{ maxWidth: "calc(100vw - 270px)", maxHeight: "calc(100vh - 62px)", overflow: "auto" }}>
            <Row gutter={[12, 12]} style={{ width: "100%" }}>
              <Col ref={bottomRef} span={24}>
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
          </Col>
        </Row>
      )}
    </div>
  );
}
