export interface TimelineEvent {
  startDate: string;
  endDate?: string;
  title: string;
  description?: string;
  tag: "work" | "personal" | "random";
  image?: {
    src: string;
    alt: string;
  };
}

export const events: TimelineEvent[] = [
  {
    startDate: "11/1984",
    title: "Born in Finland",
    description: "I was the third and last child of my parents",
    tag: "personal",
    image: {
      src: "/images/antti-vauvana.png",
      alt: "Baby photo of Antti",
    },
  },
  {
    startDate: "04/1986",
    title: "Chernobyl Disaster Impact",
    description:
      "My mum spent weeks telling me not to play in the puddles in our yard",
    tag: "random",
  },
  {
    startDate: "09/1986",
    title: "Moved to Rudolfintie, Helsinki",
    description: "Family moved to a bigger apartment in Yliskylä, Laajasalo",
    tag: "personal",
    image: {
      src: "/images/rudolfintie.png",
      alt: "Our new home on Rudolfintie street",
    },
  },
  {
    startDate: "10/1994",
    title: "Moved to Jollaksentie, Helsinki",
    description: "Moved within Laajasalo area",
    tag: "personal",
  },
  {
    startDate: "02/2003",
    title: "Moved to Kirkkosalmentie, Helsinki",
    description: "First independent apartment in Laajasalo",
    tag: "personal",
  },
  {
    startDate: "01/2004",
    title: "Moved to Nokia",
    description: "Temporary move to Nokia, don't ask.",
    tag: "personal",
  },
  {
    startDate: "06/2004",
    title: "Moved to Kantelettarentie, Helsinki",
    description: "Returned to Helsinki, lived in Kannelmäki with Hippo Taatila.",
    tag: "personal",
  },
  {
    startDate: "01/2005",
    title: "Mail Carrier at Suomen Posti",
    description: "Worked as a mail carrier in Kannelmäki",
    tag: "work",
  },
  {
    startDate: "01/2005",
    endDate: "12/2006",
    title: "Suomalainen Kirjakauppa",
    description: "Worked at Finnish bookstore chain",
    tag: "work",
  },
  {
    startDate: "01/2005",
    endDate: "12/2012",
    title: "Restaurant Valimo at Viabar",
    description: "Worked at Restaurant Valimo in Suomenlinna, Helsinki",
    tag: "work",
  },
  {
    startDate: "01/2007",
    title: "Radio Drama Writer & Actor at Yleisradio",
    description: "Started writing and acting in radio dramas for Finnish Broadcasting Company",
    tag: "work",
  },
  {
    startDate: "08/2008",
    title: "Moved to Ylöjärvi",
    description: "I went to Voinonmaan opisto, studying photography. I lasted almost half a year.",
    tag: "personal",
  },
  {
    startDate: "01/2009",
    title: "Moved back to Laajasalontie, Helsinki",
    description: "Brief return to Laajasalo area",
    tag: "personal",
  },
  {
    startDate: "08/1988",
    title: "Started Piano",
    description: "I started playing piano in the kindergarten",
    tag: "personal",
    image: {
      src: "/images/piano.png",
      alt: "Playing piano as a child",
    },
  },
  {
    startDate: "08/1991",
    title: "Started School",
    description: "I started my school in Tahvonlahti elementary school",
    tag: "personal",
  },
  {
    startDate: "08/1993",
    title: "Specialized Music Class",
    description:
      "I moved to Yliskylä elementary school to start a Specialized music class. In addition to piano, I played bass on the band. Ville, my future business partner and best friend, played the drums.",
    tag: "personal",
  },
  {
    startDate: "08/2009",
    endDate: "05/2012",
    title: "BA Documentary Photography, University of Wales",
    description: "Bachelor of Arts in Documentary Photography (dropout)",
    tag: "personal",
  },
  {
    startDate: "11/2011",
    title: "Moved to Rukatunturi",
    description: "Moved to Ruka ski resort area",
    tag: "personal",
  },
  {
    startDate: "01/2010",
    endDate: "12/2011",
    title: "Restaurant Manager at Peak & Twin Peak",
    description: "Restaurant manager at Peak and Twin Peak restaurants at Ruka fell in Kuusamo.",
    tag: "work",
  },
  {
    startDate: "07/2012",
    title: "Moved to Vartiosaari, Helsinki",
    description: "Moved to the island where Villa Kaislikko was located",
    tag: "personal",
  },
  {
    startDate: "05/2011",
    endDate: "12/2016",
    title: "Founder of Restaurant Day",
    description: "Created and led the world's largest food carnival",
    tag: "work",
    image: {
      src: "/images/ravintolapaiva.png",
      alt: "Restaurant Day food carnival event",
    },
  },
  {
    startDate: "06/2012",
    endDate: "06/2014",
    title: "Villa Kaislikko - First Business Venue",
    description: "Secured a lease and operated my first ever business venue: an event space and ballroom Villa Kaislikko in Vartiosaari, Helsinki",
    tag: "work",
    image: {
      src: "/images/kaislikko_vartiosaari_vuokrattava_huvila_veranta.jpg",
      alt: "Villa Kaislikko ballroom and event space in Vartiosaari",
    },
  },
  {
    startDate: "12/2011",
    title: "Helsinki Cultural Achievement Award",
    description: "Recognition for cultural impact through Restaurant Day",
    tag: "random",
  },
  {
    startDate: "11/2012",
    title: "Got My First Dog - Faust",
    description: "Bought my first own dog, an Alaskan Malamute named Faust",
    tag: "personal",
    image: {
      src: "/images/faust-vauvana.jpg",
      alt: "Faust as a puppy",
    },
  },
  {
    startDate: "01/2014",
    endDate: "12/2016",
    title: "Manager at Restaurant Paven",
    description: "Restaurant manager at Restaurant Paven in Espoo.",
    tag: "work",
    image: {
      src: "/images/paven.jpg",
      alt: "Working at Restaurant Paven",
    },
  },
  {
    startDate: "02/2015",
    title: "Founded First Commune in Munkkiniemi",
    description: "Moved to Munkkiniemen puistotie and founded my first commune, living with many wonderful people who I still think fondly of today",
    tag: "personal",
    image: {
      src: "/images/munkkiniemen-puistotie-18.jpg",
      alt: "Kitchen in the Munkkiniemi commune apartment",
    },
  },
  {
    startDate: "01/2015",
    endDate: "01/2016",
    title: "Olo Restaurant",
    description: "Worked at Olo Restaurant, a Michelin star restaurant in Helsinki",
    tag: "work",
    image: {
      src: "/images/restaurant-olo.jpg",
      alt: "Working in the kitchen at Olo Restaurant",
    },
  },
  {
    startDate: "01/2015",
    endDate: "01/2017",
    title: "Helsingin Ruokaradio Host",
    description: "Hosted a weekly radio show on Radio Helsinki with Timo Santala, featuring guests from Helsinki's food, drinks and hospitality industry",
    tag: "work",
    image: {
      src: "/images/radio_helsinki-ruokaradio.jpg",
      alt: "Radio Helsinki studio during Helsingin Ruokaradio show",
    },
  },
  {
    startDate: "06/2016",
    title: "Moved to Gunillankuja, Helsinki",
    description: "Moved to Laajasalo area",
    tag: "personal",
    image: {
      src: "/images/gunillankuja.jpg",
      alt: "Faust relaxing in the garden at Gunillankuja apartment",
    },
  },
  {
    startDate: "06/2016",
    title: "Met My Future Wife",
    description: "Met my future wife for the first time at Taste of Helsinki festival on June 19th, where I was selling food with Sinne Helsinki and she was having way too much wine with her friend",
    tag: "personal",
    image: {
      src: "/images/taste-of-helsinki.jpg",
      alt: "Sinne Helsinki booth at Taste of Helsinki festival",
    },
  },
  {
    startDate: "08/2014",
    endDate: "04/2017",
    title: "Hospitality Operations Director",
    description:
      "Joined Sinne Restaurants in Helsinki, a highly respected seasonal fine dining restaurant and one of the few to receive five stars from Helsingin Sanomat critic.",
    tag: "work",
    image: {
      src: "/images/sinne-bread.jpg",
      alt: "Holding freshly baked baguettes at Sinne restaurant",
    },
  },
  {
    startDate: "04/2017",
    endDate: "04/2018",
    title: "Event Producer",
    description: "Hotel and Restaurant Museum of Finland",
    tag: "work",
    image: {
      src: "/images/hotelli-ja-ravintolamuseo-antti-tuomola.JPG",
      alt: "Working at Hotel and Restaurant Museum",
    },
  },
  {
    startDate: "01/2017",
    endDate: "12/2022",
    title: "Latukahvila - Winter Cafe on Sea Ice",
    description: "Built an annual winter cafe with my friend Ville on frozen sea ice in eastern Helsinki during winter holiday week",
    tag: "personal",
    image: {
      src: "/images/latukahvila.JPG",
      alt: "Latukahvila cafe built on frozen sea ice with people enjoying winter activities",
    },
  },
  {
    startDate: "01/2018",
    endDate: "05/2022",
    title: "Business Development Director",
    description: "Led business development at ResQ Club",
    tag: "work",
    image: {
      src: "/images/resq-club.jpg",
      alt: "Working at ResQ Club office",
    },
  },
  {
    startDate: "08/2018",
    title: "Marriage Proposal in Hanko",
    description: "My future wife booked us a stunning suite at a high-class hotel in Hanko and proposed to me there on August 11th. I said yes!",
    tag: "personal",
    image: {
      src: "/images/hanko-sviitti.jpg",
      alt: "Beautiful hotel suite in Hanko where the proposal happened",
    },
  },
  {
    startDate: "01/2020",
    title: "Best Recruiting Campaign Nominee",
    description: "Nominated for the Best recruiting campaign in Finland",
    tag: "random",
  },
  {
    startDate: "08/2020",
    title: "My Firstborn Arrives",
    description: "My daughter was born! We had such a hasty departure to the hospital that I left my hot tub running. While we were at the hospital, it overheated and caught fire. The fire department managed to save part of it. When I finally got out of the hospital, I had about 39,487 missed calls and messages.",
    tag: "personal",
    image: {
      src: "/images/verna-is-born.jpg",
      alt: "Father and newborn daughter at the hospital",
    },
  },
  {
    startDate: "01/2020",
    endDate: "03/2021",
    title: "Moved to Jollaksentie, Helsinki",
    description: "Moved to Jollaksen kartano, where I managed a ballroom and a summer restaurant.",
    tag: "personal",
    image: {
      src: "/images/jollaksen-kartano-koti.jpg",
      alt: "Living space at Jollaksen kartano",
    },
  },
  {
    startDate: "01/2020",
    endDate: "04/2021",
    title: "Founder & Entrepreneur",
    description:
      "Jollaksen kartano - A ballroom in Helsinki hosting meetings, parties, and weddings",
    tag: "work",
    image: {
      src: "/images/jollaksen-kartano-venue.jpg",
      alt: "Jollaksen kartano ballroom venue",
    },
  },
  {
    startDate: "04/2021",
    title: "Moved to Tampere",
    description: "Moved to Juhannuskylä, Tampere. Loving it.",
    tag: "personal",
  },
  {
    startDate: "08/2022",
    endDate: "04/2024",
    title: "Software Developer",
    description:
      "Developed a buggeting tool for the Ministry of Finance of Finland.",
    tag: "work",
  },
  {
    startDate: "04/2024",
    title: "Head of Talent and Growth",
    description: "Matching the best people with the most exiting customers.",
    tag: "work",
  },
  {
    startDate: "01/2024",
    title: "Support Adult (Tukiaikuinen)",
    description: "Serving as a support adult for a 10-year-old child through Pirkanmaan Hyvinvointialue",
    tag: "work",
  },
];
