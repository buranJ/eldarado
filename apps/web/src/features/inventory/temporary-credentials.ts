export interface TemporaryCredentials {
  login: string;
  password: string;
}

const LOGIN_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const PASSWORD_GROUPS = [
  'abcdefghijklmnopqrstuvwxyz',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '0123456789',
  '!#$%&*+-',
] as const;
const PASSWORD_CHARACTERS = PASSWORD_GROUPS.join('');

const randomIndex = (limit: number): number => {
  const unbiasedLimit = 256 - (256 % limit);
  const bytes = new Uint8Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= unbiasedLimit);
  return bytes[0] % limit;
};

const randomString = (length: number, alphabet: string): string =>
  Array.from({ length }, () => alphabet[randomIndex(alphabet.length)]).join('');

/** Creates independent one-time placeholders without account IDs or timestamps. */
export const createTemporaryCredentials = (): TemporaryCredentials => {
  const passwordCharacters = [
    ...PASSWORD_GROUPS.map((group) => group[randomIndex(group.length)]),
    ...randomString(20 + randomIndex(9), PASSWORD_CHARACTERS),
  ];
  for (let index = passwordCharacters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [passwordCharacters[index], passwordCharacters[swapIndex]] = [
      passwordCharacters[swapIndex],
      passwordCharacters[index],
    ];
  }

  return {
    login: `${randomString(18 + randomIndex(9), LOGIN_CHARACTERS)}@gmail.com`,
    password: passwordCharacters.join(''),
  };
};
