module.exports = {
  bbc: {
    label: 'BBC',
    fetch: async (axios, parser) => {
      const feed = await parser.parseURL('http://feeds.bbci.co.uk/news/world/rss.xml');
      return feed.items.map(i => ({ title: i.title, url: i.link, publishedAt: i.pubDate }));
    }
  },
  cnn: {
    label: 'CNN',
    fetch: async (axios, parser) => {
      const feed = await parser.parseURL('http://rss.cnn.com/rss/cnn_world.rss');
      return feed.items.map(i => ({ title: i.title, url: i.link, publishedAt: i.pubDate }));
    }
  },
  reuters: {
    label: 'Reuters',
    fetch: async (axios, parser) => {
      const feed = await parser.parseURL('http://feeds.reuters.com/Reuters/worldNews');
      return feed.items.map(i => ({ title: i.title, url: i.link, publishedAt: i.pubDate }));
    }
  },
  guardian: {
    label: 'The Guardian',
    fetch: async (axios, parser) => {
      const feed = await parser.parseURL('https://www.theguardian.com/world/rss');
      return feed.items.map(i => ({ title: i.title, url: i.link, publishedAt: i.pubDate }));
    }
  },
  aljazeera: {
    label: 'Al Jazeera',
    fetch: async (axios, parser) => {
      const feed = await parser.parseURL('https://www.aljazeera.com/xml/rss/all.xml');
      return feed.items.map(i => ({ title: i.title, url: i.link, publishedAt: i.pubDate }));
    }
  }
};
