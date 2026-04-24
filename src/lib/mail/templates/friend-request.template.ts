import generateBaseLayout from "./base-layout";

export const generateFriendRequestEmail = (senderName: string, avatarUrl: string): string => {
    const content = `
    <h1>New Friend Request</h1>
    <p><strong>${senderName}</strong> has sent you a friend request.</p>
    <img src="${avatarUrl}" width="80" height="80" style="border-radius: 50%; margin-top: 10px;" />
    <p><a href="https://yourapp.com/friends" style="color: #007BFF;">View Requests</a></p>
  `;
    return generateBaseLayout("New Friend Request", content);
};
