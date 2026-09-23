import { createContext, useContext } from 'react';

export const ConfigContext = createContext({ currency: 'EUR', env: 'development' });

export const useConfig = () => useContext(ConfigContext);
