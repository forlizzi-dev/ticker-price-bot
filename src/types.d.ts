declare module '*.json' {
  const value: any;
  export default value;
}

export type BinancePrice = {
  symbol: string;
  price: number;
  timestamp: number;
  last_message: number;
  threshold: {
    min: number;
    max: number;
  };
};

export type Variation = 'up' | 'down' | 'equal';
