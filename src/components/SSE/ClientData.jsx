import React from "react";
import { Button, Col, Row } from "antd";
export default function ClientData() {
  const fetchHistory = async () => {
    // 假設您的 Express 後端運行在 3000 埠
    const historyApiUrl = process.env.REACT_APP_URL + `/api/history`;

    try {
      const sessionId = "user-1759808269118";
      const response = await fetch(historyApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
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
      return data.history;
    } catch (error) {
      console.error("獲取歷史紀錄失敗:", error);
      return [];
    }
  };
  return (
    <Row>
      <Col span={24}>
        <Button type="primary" onClick={fetchHistory}>
          撈取資料
        </Button>
      </Col>
    </Row>
  );
}
