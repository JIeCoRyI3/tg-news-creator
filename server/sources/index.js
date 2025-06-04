module.exports = {
  bbc: {
    label: 'BBC',
    fetch: async (axios, parser) => {
      const feed = await parser.parseURL('http://feeds.bbci.co.uk/news/world/rss.xml');
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
      const feed = await parser.parseURL('http://rss.cnn.com/rss/cnn_world.rss');
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
      const feed = await parser.parseURL('https://news.google.com/rss/search?q=Reuters&hl=en-US&gl=US&ceid=US:en');
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
      const feed = await parser.parseURL('https://www.theguardian.com/world/rss');
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
      const feed = await parser.parseURL('https://www.aljazeera.com/xml/rss/all.xml');
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
      const feed = await parser.parseURL('https://kyivindependent.com/feed/');
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
      const feed = await parser.parseURL('https://www.kyivpost.com/feed');
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
      const feed = await parser.parseURL('https://www.unian.net/rss/news');
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
      const feed = await parser.parseURL('https://www.pravda.com.ua/rss/view_news/');
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
      const feed = await parser.parseURL('https://www.ukrinform.net/block-lastnews?format=xml');
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
      const feed = await parser.parseURL('https://www.rferl.org/api/zmgqpqe$mggp');
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
      const feed = await parser.parseURL('https://news.google.com/rss/search?q=liga.net&hl=en-US&gl=US&ceid=US:en');
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
      const feed = await parser.parseURL('https://news.google.com/rss/search?q=rbc.ua&hl=en-US&gl=US&ceid=US:en');
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
      const feed = await parser.parseURL('https://news.google.com/rss/search?q=suspilne&hl=en-US&gl=US&ceid=US:en');
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
      const feed = await parser.parseURL('https://news.google.com/rss/search?q=hromadske&hl=en-US&gl=US&ceid=US:en');
      return feed.items.map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate,
        text: i.contentSnippet || i.content || null,
        image: i.enclosure?.url || null
      }));
    }
  }
};
