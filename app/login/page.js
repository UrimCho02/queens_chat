"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/admin");
    } else {
      setError("비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">👑</div>
          <div className="text-lg font-medium text-gray-800">더퀸즈여성의원</div>
          <div className="text-sm text-gray-500 mt-1">직원 전용 관리 페이지</div>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="비밀번호를 입력하세요"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A96E] mb-3"
        />
        {error && (
          <div className="text-red-500 text-xs mb-3 text-center">{error}</div>
        )}
        <button
          onClick={handleLogin}
          className="w-full bg-[#C9A96E] text-white rounded-xl py-3 text-sm font-medium"
        >
          로그인
        </button>
      </div>
    </div>
  );
}