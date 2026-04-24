import { TTLKey } from "@constants/ttl.constants";
import generateBaseLayout from "./base-layout";

export const generateOtpEmail = (otp: string, expire: TTLKey): string => {
    const content = `
    <h1>One-Time Password (OTP)</h1>
    <p>Your OTP is:</p>
    <div style="font-size: 28px; font-weight: bold; color: #007BFF;">${otp}</div>
    <p>This code expires in ${expire}. Do not share it with anyone.</p>
  `;
    return generateBaseLayout("Your OTP Code", content);
};
