# 💬 Live Chat — Sending Video or Audio Messages

This document explains how to send and receive **live media messages (video or audio)** using the chat WebSocket connection in real time.

---

## 🔗 WebSocket Connection URL

ws://localhost:5056/chat

yaml
Copy code

Establish a connection to this WebSocket endpoint before sending or receiving chat messages.

---

## ⚙️ Supported WebSocket Events

| Event Name             | Direction       | Description                                 |
| ---------------------- | --------------- | ------------------------------------------- |
| `chat:message_send`    | Client → Server | Triggered when a user sends a chat message. |
| `chat:message_receive` | Server → Client | Triggered when a new message is received.   |

**Acknowledgment (Ack):**  
When the server successfully receives a message, it responds with the `chat:message_receive` event.

---

## 📨 Message Send Payload

When sending a media message (video/audio), the client should emit the `chat:message_send` event with the following payload:

```json
{
  "receiverId": "56748719-033f-4961-8b18-a06c9a96fe6e",
  "content": "Hey Emil! How are you doing today?",
  "mediaUrl": "https://www.youtube.com/watch?v=XOgZo66gKQA&list=RDXOgZo66gKQA&start_radio=1",
  "LiveMediaType": "VIDEO"
}
🧩 Payload Fields
Field Name	Type	Required	Description
receiverId	string	✅	The unique ID of the user receiving the message.
content	string	✅	The text content of the message.
mediaUrl	string	⚙️ Optional	A valid URL to the media file (e.g., YouTube, MP3, MP4).
LiveMediaType	string	⚙️ Optional	Type of media being shared. Accepted values: "VIDEO", "AUDIO".

📩 Message Receive Payload
When a message is received by the server, it will broadcast the following payload to both sender and receiver under the event chat:message_receive.

json
Copy code
{
  "id": "8e88d043-8086-42e6-95ac-1ce880a72f67",
  "chatId": "3e644321-b351-4615-a9fe-50531f1ee9be",
  "content": "Hey Emil! How are you doing today?",
  "mediaUrl": "https://www.youtube.com/watch?v=XOgZo66gKQA&list=RDXOgZo66gKQA&start_radio=1",
  "mediaType": "VIDEO",
  "sender": {
    "id": "4fe4c167-b94a-4097-ac53-833cf1cf83db",
    "name": "ss joy",
    "avatar": null
  },
  "createdAt": "2025-11-05T19:45:32.782Z"
}
🧩 Response Fields
Field Name	Type	Description
id	string	Unique ID of the chat message.
chatId	string	ID of the chat session/conversation.
content	string	Text message content.
mediaUrl	string	URL to the media file shared in the message.
mediaType	string	Type of media, e.g. "VIDEO" or "AUDIO".
sender	object	Sender details. Includes id, name, and optional avatar.
createdAt	string	ISO timestamp of when the message was created.

✅ Example Flow
Client emits: chat:message_send

Server acknowledges: chat:message_receive

Receiver gets real-time message through the same event.

🧠 Notes
The LiveMediaType determines how the frontend should render the message (e.g., embedded video or audio player).

All timestamps follow ISO 8601 UTC format.

Ensure the WebSocket connection remains open for real-time message delivery.

For best performance, maintain an active user session via authentication tokens or session IDs.

© 2025 — Live Chat Media Messaging API



---


```
