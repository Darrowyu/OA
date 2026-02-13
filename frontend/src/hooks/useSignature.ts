import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { logger } from '@/lib/logger';

const SIGNATURE_CACHE_KEY = 'signature_cache';
const SIGNATURE_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

interface SignatureCache {
  [username: string]: {
    data: string;
    timestamp: number;
  };
}

export function useSignature() {
  const [signatures, setSignatures] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // 从localStorage加载缓存
  useEffect(() => {
    const cached = localStorage.getItem(SIGNATURE_CACHE_KEY);
    if (cached) {
      try {
        const cache: SignatureCache = JSON.parse(cached);
        const now = Date.now();
        const validSignatures = new Map<string, string>();

        Object.entries(cache).forEach(([username, item]) => {
          if (now - item.timestamp < SIGNATURE_CACHE_EXPIRY) {
            validSignatures.set(username, item.data);
          }
        });

        setSignatures(validSignatures);
      } catch (e) {
        logger.error('解析签名缓存失败', { error: e });
      }
    }
  }, []);

  // 保存到localStorage
  const saveToCache = useCallback((username: string, signatureData: string) => {
    const cached = localStorage.getItem(SIGNATURE_CACHE_KEY);
    let cache: SignatureCache = {};

    if (cached) {
      try {
        cache = JSON.parse(cached);
      } catch (e) {
        logger.error('解析签名缓存失败', { error: e });
      }
    }

    cache[username] = {
      data: signatureData,
      timestamp: Date.now(),
    };

    localStorage.setItem(SIGNATURE_CACHE_KEY, JSON.stringify(cache));
  }, []);

  // 获取单个签名
  const getSignature = useCallback(async (username: string): Promise<string | null> => {
    // 先检查内存缓存
    if (signatures.has(username)) {
      return signatures.get(username) || null;
    }

    // 检查localStorage缓存
    const cached = localStorage.getItem(SIGNATURE_CACHE_KEY);
    if (cached) {
      try {
        const cache: SignatureCache = JSON.parse(cached);
        const item = cache[username];
        if (item && Date.now() - item.timestamp < SIGNATURE_CACHE_EXPIRY) {
          setSignatures(prev => new Map(prev).set(username, item.data));
          return item.data;
        }
      } catch (e) {
        logger.error('解析签名缓存失败', { error: e });
      }
    }

    // 从服务器获取
    try {
      setIsLoading(true);
      const data = await api.get<{ signature?: string }>(`/api/signatures/${username}`);
      const signatureData = data?.signature;

      if (signatureData) {
        setSignatures(prev => new Map(prev).set(username, signatureData));
        saveToCache(username, signatureData);
        return signatureData;
      }
    } catch (error) {
      logger.error('获取签名失败', { error });
    } finally {
      setIsLoading(false);
    }

    return null;
  }, [signatures, saveToCache]);

  // 批量获取签名
  const getSignaturesBatch = useCallback(async (usernames: string[]): Promise<Map<string, string>> => {
    const result = new Map<string, string>();
    const toFetch: string[] = [];

    // 检查缓存
    usernames.forEach(username => {
      if (signatures.has(username)) {
        result.set(username, signatures.get(username) || '');
      } else {
        toFetch.push(username);
      }
    });

    if (toFetch.length === 0) {
      return result;
    }

    // 批量获取
    try {
      setIsLoading(true);
      const data = await api.post<{ signatures?: Record<string, string> }>('/api/signatures/batch', {
        usernames: toFetch,
      });

      const fetchedSignatures = data?.signatures || {};
      Object.entries(fetchedSignatures).forEach(([username, sigData]) => {
        if (sigData) {
          result.set(username, sigData);
          setSignatures(prev => new Map(prev).set(username, sigData));
          saveToCache(username, sigData);
        }
      });
    } catch (error) {
      logger.error('批量获取签名失败', { error });
    } finally {
      setIsLoading(false);
    }

    return result;
  }, [signatures, saveToCache]);

  // 保存签名
  const saveSignature = useCallback(async (username: string, signatureData: string): Promise<boolean> => {
    try {
      await api.put(`/api/signatures/${username}`, {
        signature: signatureData,
      });

      setSignatures(prev => new Map(prev).set(username, signatureData));
      saveToCache(username, signatureData);

      return true;
    } catch (error) {
      logger.error('保存签名失败', { error });
      return false;
    }
  }, [saveToCache]);

  // 清除缓存
  const clearCache = useCallback(() => {
    localStorage.removeItem(SIGNATURE_CACHE_KEY);
    setSignatures(new Map());
  }, []);

  return {
    signatures,
    isLoading,
    getSignature,
    getSignaturesBatch,
    saveSignature,
    clearCache,
  };
}

export default useSignature;
