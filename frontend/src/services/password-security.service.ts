import * as Crypto from 'expo-crypto';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as commonPackage from '@zxcvbn-ts/language-common';
import * as englishPackage from '@zxcvbn-ts/language-en';

const passwordStrengthChecker = new ZxcvbnFactory({
  translations: englishPackage.translations,
  graphs: commonPackage.adjacencyGraphs,
  dictionary: {
    ...commonPackage.dictionary,
    ...englishPackage.dictionary,
  },
});

export const getPasswordStrengthScore = (password: string): number =>
  passwordStrengthChecker.check(password).score;

export const checkPasswordBreach = async (password: string): Promise<number> => {
  const hash = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, password)).toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Sızdırılmış şifre kontrolü başarısız oldu (${response.status}).`);

    const matches = await response.text();
    const match = matches
      .split(/\r?\n/)
      .find((line) => line.split(':', 1)[0]?.trim().toUpperCase() === suffix);

    return match ? Number.parseInt(match.split(':')[1]?.trim() || '0', 10) : 0;
  } finally {
    clearTimeout(timeout);
  }
};
