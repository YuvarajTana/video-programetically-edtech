import {createContext, useContext} from 'react';
import type {ReactNode} from 'react';
import {ThemeProvider} from '../themes';
import {CHANNELS} from '@video-kit/core/channels';
import type {ChannelProfile} from '@video-kit/core/channels';

const ChannelContext = createContext<ChannelProfile>(CHANNELS.tech);

export const ChannelProvider: React.FC<{
  channel: ChannelProfile;
  children: ReactNode;
}> = ({channel, children}) => (
  <ChannelContext.Provider value={channel}>
    <ThemeProvider theme={channel.theme}>{children}</ThemeProvider>
  </ChannelContext.Provider>
);

export const useChannel = () => useContext(ChannelContext);
