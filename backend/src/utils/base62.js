import dotenv from "dotenv";
dotenv.config();

const CHARSET = process.env.BASE62_CHARSET;
const SECRET_MASK_ENV = process.env.SECRET_MASK;

if (!CHARSET || CHARSET.length !== 62) {
  console.error("FATAL ERROR: BASE62_CHARSET in .env must be exactly 62 characters long.");
  process.exit(1); 
}

if (!SECRET_MASK_ENV) {
  console.error("FATAL ERROR: SECRET_MASK must be defined in .env.");
  process.exit(1);
}

const BASE = CHARSET.length;
const SECRET_MASK = BigInt(SECRET_MASK_ENV);

export const encodeBase62 = (num) => {
  let obfuscatedNum = Number(BigInt(num) ^ SECRET_MASK);

  if (obfuscatedNum === 0) return CHARSET[0];
  let str = "";
  
  while (obfuscatedNum > 0) {
    str = CHARSET[obfuscatedNum % BASE] + str;
    obfuscatedNum = Math.floor(obfuscatedNum / BASE);
  }
  
  return str;
};
