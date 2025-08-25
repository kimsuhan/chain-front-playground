"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

import { BlockInfo } from "@/lib/web3";

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastBlocks, setLastBlocks] = useState<BlockInfo[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // lastBlocks 변화 감지용 useEffect
  useEffect(() => {
    console.log("useSocket - lastBlocks 상태 변경됨:", lastBlocks);
  }, [lastBlocks]);

  useEffect(() => {
    // Socket.IO 서버 연결
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4001";
    socketRef.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
    });

    const socket = socketRef.current;

    // 연결 이벤트 처리
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setIsConnected(true);
      // 블록 업데이트 구독
      socket.emit("subscribe");
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connected", (data) => {
      console.log("서버 연결 확인:", data);
    });

    socket.on("subscribed", (data) => {
      console.log("블록 업데이트 구독:", data);
    });

    // 새 블록 이벤트 처리 (배열로 받음)
    socket.on("newBlock", (data: any) => {
      console.log("🆕 새 블록 데이터 받음:", data);
      console.log("데이터 타입:", typeof data, "배열인가?", Array.isArray(data));

      // 데이터가 배열인지 확인
      const blocksData = Array.isArray(data) ? data : [data];

      // 백엔드에서 받은 데이터를 BlockInfo 배열로 변환
      const newBlocks: BlockInfo[] = blocksData.map((blockData: any) => ({
        number: blockData.number || 0,
        hash: blockData.hash || "",
        timestamp: blockData.timestamp || 0,
        transactionCount: blockData.transactionCount || 0,
        gasUsed: blockData.gasUsed || "0",
        gasLimit: blockData.gasLimit || "0",
        miner: blockData.miner || "",
        parentHash: blockData.parentHash || "",
        parentBeaconBlockRoot: blockData.parentBeaconBlockRoot || "",
        nonce: blockData.nonce || "",
        difficulty: blockData.difficulty || "0",
        stateRoot: blockData.stateRoot || "",
        receiptsRoot: blockData.receiptsRoot || "",
        blobGasUsed: blockData.blobGasUsed || "0",
        excessBlobGas: blockData.excessBlobGas || "0",
      }));

      console.log("변환된 블록 데이터:", newBlocks);
      console.log("상태 업데이트 전 lastBlocks:", lastBlocks);
      
      // 새로운 배열 객체로 강제 업데이트 (참조 변경)
      setLastBlocks([...newBlocks]);
      console.log("setLastBlocks 호출됨");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket 연결 오류:", error);
      setIsConnected(false);
    });

    // 컴포넌트 언마운트 시 연결 해제
    return () => {
      if (socket) {
        console.log("Socket 연결 해제");
        socket.disconnect();
      }
    };
  }, []);

  // 수동으로 재연결
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  };

  return {
    isConnected,
    lastBlocks,
    reconnect,
    socket: socketRef.current,
  };
}
