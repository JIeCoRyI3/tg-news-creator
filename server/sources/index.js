const iconv = require('iconv-lite');
const { fetchChannelMessages } = require('./telegram');

async function fetchFeed(url, axios, parser) {
  const res = await axios.get(url, { responseType: 'arraybuffer', maxRedirects: 5 });
  const charset = res.headers['content-type']?.match(/charset=([^;]+)/i)?.[1] || 'utf8';
  const xml = iconv.decode(res.data, charset);
  return parser.parseString(xml);
}

module.exports = {
  bbc: {
    label: 'BBC',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('http://feeds.bbci.co.uk/news/world/rss.xml', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  cnn: {
    label: 'CNN',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('http://rss.cnn.com/rss/cnn_world.rss', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  reuters: {
    label: 'Reuters',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://news.google.com/rss/search?q=Reuters&hl=en-US&gl=US&ceid=US:en', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  guardian: {
    label: 'The Guardian',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://www.theguardian.com/world/rss', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  aljazeera: {
    label: 'Al Jazeera',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://www.aljazeera.com/xml/rss/all.xml', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  kyivindependent: {
    label: 'Kyiv Independent',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://kyivindependent.com/feed/rss/', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  kyivpost: {
    label: 'Kyiv Post',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://www.kyivpost.com/feed', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  unian: {
    label: 'UNIAN',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://rss.unian.net/site/news_eng.rss', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  pravda: {
    label: 'Ukrainska Pravda',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://www.pravda.com.ua/rss/view_news/', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  ukrinform: {
    label: 'Ukrinform',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://www.ukrinform.net/rss/block-lastnews', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  rferl: {
    label: 'RFE/RL',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://www.rferl.org/api/', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  liga: {
    label: 'Liga',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://news.google.com/rss/search?q=liga.net&hl=en-US&gl=US&ceid=US:en', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  rbc: {
    label: 'RBC Ukraine',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://news.google.com/rss/search?q=rbc.ua&hl=en-US&gl=US&ceid=US:en', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  suspilne: {
    label: 'Suspilne',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://news.google.com/rss/search?q=suspilne&hl=en-US&gl=US&ceid=US:en', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  hromadske: {
    label: 'Hromadske',
    fetch: async (axios, parser) => {
      const feed = await fetchFeed('https://news.google.com/rss/search?q=hromadske&hl=en-US&gl=US&ceid=US:en', axios, parser);
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  },
  telegram: {
    label: 'Telegram Channel',
    fetch: async (_, __, options) => {
      const channel = options?.channel || process.env.TELEGRAM_CHANNEL;
      if (!channel) throw new Error('TELEGRAM_CHANNEL is not defined');
      return fetchChannelMessages(channel);
    }
  }
};
