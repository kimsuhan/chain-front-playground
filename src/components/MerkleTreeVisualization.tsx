"use client";

import React from 'react';
import { buildMerkleTree, getMerkleTreeLevels, MerkleNode, formatHash } from '@/utils/merkleTree';

interface MerkleTreeVisualizationProps {
  transactionHashes: string[];
  title?: string;
}

export default function MerkleTreeVisualization({ 
  transactionHashes, 
  title = "머클트리 구조" 
}: MerkleTreeVisualizationProps) {
  if (transactionHashes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">🌳</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">머클트리가 없습니다</h3>
        <p className="text-gray-500">이 블록에는 트랜잭션이 없어 머클트리가 생성되지 않습니다.</p>
      </div>
    );
  }

  const merkleRoot = buildMerkleTree(transactionHashes);
  const levels = getMerkleTreeLevels(merkleRoot);

  const copyToClipboard = (hash: string) => {
    navigator.clipboard.writeText(hash);
    alert("클립보드에 복사되었습니다!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <div className="text-sm text-gray-600">
          트랜잭션 수: {transactionHashes.length}개 | 트리 높이: {levels.length}레벨
        </div>
      </div>

      {/* 머클루트 표시 */}
      {merkleRoot && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-600 mb-1">머클루트 (Merkle Root)</div>
              <div className="font-mono text-sm text-blue-800">{merkleRoot.hash}</div>
            </div>
            <button
              onClick={() => copyToClipboard(merkleRoot.hash)}
              className="bg-blue-100 text-blue-600 px-3 py-2 rounded hover:bg-blue-200 transition-colors"
              title="복사"
            >
              📋
            </button>
          </div>
        </div>
      )}

      {/* 트리 시각화 */}
      <div className="bg-white border rounded-lg p-6 overflow-x-auto">
        <div className="space-y-8">
          {levels.map((level, levelIndex) => (
            <div key={levelIndex} className="space-y-2">
              {/* 레벨 헤더 */}
              <div className="text-sm font-medium text-gray-500 mb-4">
                {levelIndex === 0 
                  ? `리프 노드 (레벨 ${levelIndex + 1})`
                  : levelIndex === levels.length - 1
                    ? `루트 노드 (레벨 ${levelIndex + 1})`
                    : `중간 노드 (레벨 ${levelIndex + 1})`
                }
              </div>
              
              {/* 노드들 */}
              <div className="grid gap-2" style={{ 
                gridTemplateColumns: `repeat(${Math.max(level.length, 1)}, 1fr)` 
              }}>
                {level.map((node, nodeIndex) => (
                  <div
                    key={`${levelIndex}-${nodeIndex}`}
                    className={`
                      relative p-3 rounded-lg border-2 text-center transition-all duration-200
                      ${node.isLeaf 
                        ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }
                    `}
                  >
                    {/* 노드 내용 */}
                    <div className="space-y-1">
                      <div className={`text-xs font-medium ${
                        node.isLeaf ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {node.isLeaf ? 'TX' : 'HASH'}
                      </div>
                      <div 
                        className="font-mono text-xs cursor-pointer hover:underline"
                        onClick={() => copyToClipboard(node.hash)}
                        title="클릭하여 복사"
                      >
                        {formatHash(node.hash, 12)}
                      </div>
                    </div>

                    {/* 연결선 (부모로 향하는) */}
                    {levelIndex < levels.length - 1 && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="w-px h-4 bg-gray-300"></div>
                      </div>
                    )}

                    {/* 연결선 (자식에서 오는) */}
                    {!node.isLeaf && (
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="w-px h-4 bg-gray-300"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* 레벨 간 연결선 */}
              {levelIndex < levels.length - 1 && (
                <div className="flex justify-center items-center h-6">
                  <div className="flex space-x-8">
                    {Array.from({ length: Math.ceil(level.length / 2) }).map((_, i) => (
                      <div key={i} className="flex items-center">
                        <div className="w-8 h-px bg-gray-300"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                        <div className="w-8 h-px bg-gray-300"></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 설명 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-800 mb-2">머클트리란?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 모든 트랜잭션을 효율적으로 요약하는 이진 트리 구조입니다</li>
          <li>• 리프 노드는 개별 트랜잭션 해시를 나타냅니다</li>
          <li>• 각 부모 노드는 두 자식 노드의 해시를 결합한 값입니다</li>
          <li>• 루트 해시로 블록의 모든 트랜잭션 무결성을 검증할 수 있습니다</li>
          <li>• 노드를 클릭하면 해시를 클립보드에 복사할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
}