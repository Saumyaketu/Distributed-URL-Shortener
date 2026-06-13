import dotenv from "dotenv";
dotenv.config();
import Sqids from 'sqids';

const CHARSET = process.env.BASE62_CHARSET;

if (!CHARSET || CHARSET.length !== 62) {
  console.error("FATAL ERROR: BASE62_CHARSET in .env must be exactly 62 characters long.");
  process.exit(1); 
}

const sqids = new Sqids({
  alphabet: CHARSET,
  minLength: 7,
});

export const encodeBase62 = (num) => {
  return sqids.encode([num]); 
};
