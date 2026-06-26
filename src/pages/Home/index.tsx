import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AntDesign } from '@expo/vector-icons';
import ViewPager from 'react-native-pager-view';

import Feed from './Feed';

import {
  Container,
  Header,
  Text,
  Tab,
  Separator,
  RefreshButton,
  CenterMessage,
  MessageText,
} from './styles';

interface FeedItem {
  id: string;
  username: string;
  tags: string;
  music: string;
  likes: number;
  comments: number;
  uri: string;
}

const DEFAULT_VIDEO_SERVER_URL = 'http://localhost:3333';

const Home: React.FC = () => {
  const [tab, setTab] = useState(1);
  const [active, setActive] = useState(0);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedVersion, setFeedVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoServerUrl = useMemo(
    () =>
      (
        process.env.EXPO_PUBLIC_VIDEO_SERVER_URL || DEFAULT_VIDEO_SERVER_URL
      ).replace(/\/$/, ''),
    [],
  );
  const feedRoute = tab === 2 ? '/api/clips' : '/api/feed';

  const loadFeed = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await fetch(`${videoServerUrl}${feedRoute}?ts=${Date.now()}`);

        if (!response.ok) {
          throw new Error(`Video server returned ${response.status}`);
        }

        const payload = (await response.json()) as { feed?: FeedItem[] };

        setFeed(payload.feed || []);
        setFeedVersion(version => version + 1);
        setActive(0);
        setError(null);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load video feed',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [feedRoute, videoServerUrl],
  );

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  if (loading) {
    return (
      <Container>
        <CenterMessage>
          <ActivityIndicator color="#fff" />
          <MessageText>Loading local videos</MessageText>
        </CenterMessage>
      </Container>
    );
  }

  if (error || feed.length === 0) {
    return (
      <Container>
        <Header>
          <Tab onPress={() => setTab(1)}>
            <Text $active={tab === 1}>Full Video</Text>
          </Tab>
          <Separator>|</Separator>
          <Tab onPress={() => setTab(2)}>
            <Text $active={tab === 2}>Clips</Text>
          </Tab>
          <RefreshButton onPress={() => loadFeed(true)} disabled={refreshing}>
            <AntDesign name="reload" size={22} color="#fff" />
          </RefreshButton>
        </Header>
        <CenterMessage>
          <MessageText>{error || 'No video files found'}</MessageText>
        </CenterMessage>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Tab onPress={() => setTab(1)}>
          <Text $active={tab === 1}>Full Video</Text>
        </Tab>
        <Separator>|</Separator>
        <Tab onPress={() => setTab(2)}>
          <Text $active={tab === 2}>Clips</Text>
        </Tab>
        <RefreshButton onPress={() => loadFeed(true)} disabled={refreshing}>
          {refreshing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AntDesign name="reload" size={22} color="#fff" />
          )}
        </RefreshButton>
      </Header>
      <ViewPager
        key={feedVersion}
        onPageSelected={e => {
          setActive(e.nativeEvent.position);
        }}
        orientation="vertical"
        style={{ flex: 1 }}
        initialPage={0}
      >
        {feed.map((item, index) => (
          <View key={item.id}>
            <Feed item={item} play={index === active} />
          </View>
        ))}
      </ViewPager>
    </Container>
  );
};

export default Home;
