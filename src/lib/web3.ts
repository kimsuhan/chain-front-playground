// Web3 연결을 위한 유틸리티 파일
import { ethers, Transaction } from "ethers";

// 노드 연결 설정
export const LOCAL_RPC_URL = process.env.RPC_URL || "http://forlong.io:8545";

// 이더리움 프로바이더 설정 (노드에 연결)
export const provider = new ethers.JsonRpcProvider(LOCAL_RPC_URL);

// 기본 계정들 가져오기
export const getDefaultAccounts = (): string[] => {
  const accountsString = process.env.DEFAULT_ACCOUNTS;
  console.log("DEFAULT_ACCOUNTS 환경변수:", accountsString);
  console.log("RPC_URL 환경변수 (비교용):", process.env.RPC_URL);

  if (!accountsString) {
    console.warn("DEFAULT_ACCOUNTS 환경변수가 설정되지 않았습니다.");
    return [];
  }

  const accounts = accountsString.split(",").map((addr) => addr.trim());
  console.log("파싱된 계정들:", accounts);
  return accounts;
};

// 블록 정보 타입 정의
export interface BlockInfo {
  number: number;
  hash: string;
  timestamp: number;
  transactionCount: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
  parentHash: string;
  parentBeaconBlockRoot: string;
  nonce: string;
  difficulty: string;
  stateRoot: string;
  receiptsRoot: string;
  blobGasUsed: string;
  excessBlobGas: string;
}

// 트랜잭션 정보 타입 정의
export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  gasPrice: string;
  timestamp?: number;
  status?: number;
}

// 최신 블록 정보 가져오기
export async function getLatestBlock(): Promise<BlockInfo | null> {
  try {
    const block = await provider.getBlock("latest", true);
    if (!block) return null;

    return {
      number: block.number,
      hash: block.hash ?? "-",
      timestamp: block.timestamp,
      transactionCount: block.transactions.length,
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
      miner: block.miner,
      parentHash: block.parentHash,
      parentBeaconBlockRoot: block.parentBeaconBlockRoot ?? "",
      nonce: block.nonce,
      difficulty: block.difficulty.toString(),
      stateRoot: block.stateRoot ?? "",
      receiptsRoot: block.receiptsRoot ?? "",
      blobGasUsed: block.blobGasUsed?.toString() ?? "",
      excessBlobGas: block.excessBlobGas?.toString() ?? "",
    };
  } catch (error) {
    console.error("최신 블록 가져오기 실패:", error);
    return null;
  }
}

// 특정 블록 정보 가져오기 (블록 번호로 조회)
export async function getBlockByNumber(blockNumber: number): Promise<BlockInfo | null> {
  try {
    const block = await provider.getBlock(blockNumber, true);
    if (!block) return null;

    return {
      number: block.number,
      hash: block.hash ?? "",
      timestamp: block.timestamp,
      transactionCount: block.transactions.length,
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
      miner: block.miner,
      parentHash: block.parentHash,
      parentBeaconBlockRoot: block.parentBeaconBlockRoot ?? "",
      nonce: block.nonce,
      difficulty: block.difficulty.toString(),
      stateRoot: block.stateRoot ?? "",
      receiptsRoot: block.receiptsRoot ?? "",
      blobGasUsed: block.blobGasUsed?.toString() ?? "",
      excessBlobGas: block.excessBlobGas?.toString() ?? "",
    };
  } catch (error) {
    console.error(`블록 ${blockNumber} 가져오기 실패:`, error);
    return null;
  }
}

// 최근 블록들 가져오기 (개수 지정)
export async function getRecentBlocks(count: number = 10): Promise<BlockInfo[]> {
  try {
    const latestBlockNumber = await provider.getBlockNumber();
    const blocks: BlockInfo[] = [];

    // 최신 블록부터 거꾸로 가져오기
    for (let i = 0; i < count; i++) {
      const blockNumber = latestBlockNumber - i;
      if (blockNumber < 0) break;

      const blockInfo = await getBlockByNumber(blockNumber);
      if (blockInfo) {
        blocks.push(blockInfo);
      }
    }

    return blocks;
  } catch (error) {
    console.error("최근 블록들 가져오기 실패:", error);
    return [];
  }
}

// 트랜잭션 정보 가져오기
export async function getTransactionByHash(txHash: string): Promise<TransactionInfo | null> {
  try {
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!tx) return null;

    // 트랜잭션이 포함된 블록 정보도 가져와서 타임스탬프 추가
    let timestamp: number | undefined;
    if (tx.blockNumber) {
      const block = await provider.getBlock(tx.blockNumber);
      timestamp = block?.timestamp;
    }

    return {
      hash: tx.hash,
      blockNumber: tx.blockNumber || 0,
      from: tx.from,
      to: tx.to || "",
      value: ethers.formatEther(tx.value),
      gasUsed: receipt?.gasUsed.toString(),
      gasPrice: tx.gasPrice?.toString() || "0",
      timestamp,
      status: receipt?.status ?? 0,
    };
  } catch (error) {
    console.error(`트랜잭션 ${txHash} 가져오기 실패:`, error);
    return null;
  }
}

// 계정 잔액 조회
export async function getAccountBalance(address: string): Promise<string | null> {
  try {
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error(`계정 ${address} 잔액 조회 실패:`, error);
    return null;
  }
}

// 특정 블록의 모든 트랜잭션 가져오기
export async function getTransactionsFromBlock(blockNumber: number): Promise<TransactionInfo[]> {
  try {
    const block = await provider.getBlock(blockNumber, true);
    if (!block || !block.transactions) return [];

    const transactions: TransactionInfo[] = [];

    for (const tx of block.transactions) {
      if (typeof tx === "string") {
        // 트랜잭션 해시만 있는 경우, 상세 정보 가져오기
        const txInfo = await getTransactionByHash(tx);
        if (txInfo) transactions.push(txInfo);
      } else {
        const txInfo = tx as Transaction;

        // 트랜잭션 전체 정보가 있는 경우
        const receipt = await provider.getTransactionReceipt(txInfo.hash ?? "");
        transactions.push({
          hash: txInfo.hash ?? "",
          blockNumber: 0,
          from: txInfo.from ?? "",
          to: txInfo.to ?? "",
          value: ethers.formatEther(txInfo.value),
          gasUsed: receipt?.gasUsed.toString(),
          gasPrice: txInfo.gasPrice?.toString() || "0",
          timestamp: block.timestamp,
          status: receipt?.status ?? 0,
        });
      }
    }

    return transactions;
  } catch (error) {
    console.error(`블록 ${blockNumber}의 트랜잭션 가져오기 실패:`, error);
    return [];
  }
}

// 네트워크 연결 상태 확인
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    await provider.getBlockNumber();
    return true;
  } catch (error) {
    console.error("네트워크 연결 확인 실패:", error);
    return false;
  }
}

// API에서 블록 정보 가져오기
export async function getBlocksFromAPI(
  limit: number = 20,
  offset: number = 0
): Promise<{ blocks: BlockInfo[]; total: number }> {
  try {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    const response = await fetch(`${apiUrl}/block?limit=${limit}&offset=${offset}`);

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const apiResponse = await response.json();
    const { data: blockStrings, total } = apiResponse;

    // JSON 문자열들을 파싱하여 BlockInfo 형태로 변환
    const blocks: BlockInfo[] = blockStrings.map((blockData: BlockInfo) => {
      return {
        number: blockData.number,
        hash: blockData.hash ?? "",
        timestamp: blockData.timestamp,
        transactionCount: blockData.transactionCount || 0,
        gasUsed: blockData.gasUsed ?? "", // API에서 gasUsed 정보가 없으므로 기본값
        gasLimit: blockData.gasLimit ?? "", // API에서 gasLimit 정보가 없으므로 기본값
        miner: blockData.miner ?? "",
        parentHash: blockData.parentHash ?? "", // API에서 parentHash 정보가 없으므로 기본값
        parentBeaconBlockRoot: blockData.parentBeaconBlockRoot ?? "", // API에서 parentBeaconBlockRoot 정보가 없으므로 기본값
        nonce: blockData.nonce ?? "", // API에서 nonce 정보가 없으므로 기본값
        difficulty: blockData.difficulty ?? "", // API에서 difficulty 정보가 없으므로 기본값
        stateRoot: blockData.stateRoot ?? "", // API에서 stateRoot 정보가 없으므로 기본값
        receiptsRoot: blockData.receiptsRoot ?? "", // API에서 receiptsRoot 정보가 없으므로 기본값
        blobGasUsed: blockData.blobGasUsed ?? "", // API에서 blobGasUsed 정보가 없으므로 기본값
        excessBlobGas: blockData.excessBlobGas ?? "", // API에서 excessBlobGas 정보가 없으므로 기본값
      };
    });

    return { blocks, total };
  } catch (error) {
    console.error("API에서 블록 정보 가져오기 실패:", error);
    throw error;
  }
}

// API에서 특정 블록 정보 가져오기
export async function getBlockFromAPI(blockNumber: number): Promise<BlockInfo | null> {
  try {
    const apiUrl = process.env.API_URL || "http://localhost:4000";
    const response = await fetch(`${apiUrl}/block/redis/${blockNumber}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const blockData = await response.json();

    console.log(blockData);

    if (!blockData) {
      return null;
    }

    // API에서 받은 데이터를 BlockInfo 형태로 변환
    return {
      number: blockData.number,
      hash: blockData.hash ?? "",
      timestamp: blockData.timestamp,
      transactionCount: blockData.transactions || 0,
      gasUsed: blockData.gasUsed ?? "",
      gasLimit: blockData.gasLimit ?? "",
      miner: blockData.miner ?? "",
      parentHash: blockData.parentHash ?? "",
      parentBeaconBlockRoot: blockData.parentBeaconBlockRoot ?? "",
      nonce: blockData.nonce ?? "",
      difficulty: blockData.difficulty ?? "",
      stateRoot: blockData.stateRoot ?? "",
      receiptsRoot: blockData.receiptsRoot ?? "",
      blobGasUsed: blockData.blobGasUsed ?? "",
      excessBlobGas: blockData.excessBlobGas ?? "",
    };
  } catch (error) {
    console.error(`API에서 블록 ${blockNumber} 정보 가져오기 실패:`, error);
    throw error;
  }
}
