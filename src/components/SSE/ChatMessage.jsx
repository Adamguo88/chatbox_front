// ChatMessage.js
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./ChatMessage.css"; // 稍後創建這個 CSS 檔案

const ChatMessage = ({ role, content }) => {
  // 根據 role 決定 CSS 類別
  const isQuestion = role === "user";
  const messageClass = isQuestion ? "message-question" : "message-answer";

  return (
    // 'message-container' 決定外層的對齊
    <div className={`message-container ${messageClass}`}>
      {/* 'message-bubble' 決定氣泡本身的樣式和內容 */}
      <div className="message-bubble">
        <ReactMarkdown
          // 啟用 GFM 支援，這樣就能渲染表格、刪除線等
          remarkPlugins={[remarkGfm]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;
