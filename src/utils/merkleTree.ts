// 머클트리 생성 및 시각화를 위한 유틸리티

import { createHash } from 'crypto';

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  isLeaf: boolean;
  data?: string; // 트랜잭션 해시 (리프 노드인 경우)
}

/**
 * 두 해시를 합쳐서 새로운 해시 생성
 */
function combineHashes(left: string, right: string): string {
  // 브라우저에서는 crypto.createHash를 사용할 수 없으므로 간단한 해시 함수 사용
  return hashString(left + right);
}

/**
 * 문자열을 간단한 해시로 변환 (브라우저 호환)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  
  // 16진수로 변환하고 앞에 0x 접두사 추가
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hexHash}`;
}

/**
 * 트랜잭션 해시 배열로부터 머클트리 생성
 */
export function buildMerkleTree(transactionHashes: string[]): MerkleNode | null {
  if (transactionHashes.length === 0) {
    return null;
  }

  // 리프 노드들 생성
  let currentLevel: MerkleNode[] = transactionHashes.map(hash => ({
    hash: hash,
    isLeaf: true,
    data: hash,
  }));

  // 트랜잭션이 홀수개일 때 마지막을 복제
  if (currentLevel.length % 2 === 1) {
    currentLevel.push({
      hash: currentLevel[currentLevel.length - 1].hash,
      isLeaf: true,
      data: currentLevel[currentLevel.length - 1].data,
    });
  }

  // 루트까지 올라가면서 트리 구성
  while (currentLevel.length > 1) {
    const nextLevel: MerkleNode[] = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1];

      const parentHash = combineHashes(left.hash, right.hash);
      
      const parentNode: MerkleNode = {
        hash: parentHash,
        left: left,
        right: right,
        isLeaf: false,
      };

      nextLevel.push(parentNode);
    }

    currentLevel = nextLevel;
  }

  return currentLevel[0]; // 루트 노드 반환
}

/**
 * 머클트리를 레벨별로 정리하여 반환
 */
export function getMerkleTreeLevels(root: MerkleNode | null): MerkleNode[][] {
  if (!root) return [];

  const levels: MerkleNode[][] = [];
  const queue: { node: MerkleNode; level: number }[] = [{ node: root, level: 0 }];

  while (queue.length > 0) {
    const { node, level } = queue.shift()!;

    if (!levels[level]) {
      levels[level] = [];
    }

    levels[level].push(node);

    if (node.left) {
      queue.push({ node: node.left, level: level + 1 });
    }
    if (node.right) {
      queue.push({ node: node.right, level: level + 1 });
    }
  }

  return levels.reverse(); // 리프부터 루트 순으로 반환
}

/**
 * 해시를 짧게 표시하는 함수
 */
export function formatHash(hash: string, length: number = 8): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...`;
}