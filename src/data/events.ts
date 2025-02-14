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
    startDate: "08/1986",
    title: "Moving Houses",
    description:
      "We moved to a bigger apartment within Yliskylä in Laajasalo island",
    tag: "personal",
    image: {
      src: "/images/rudolfintie.png",
      alt: "Our new home on Rudolfintie street",
    },
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
    startDate: "09/2009",
    endDate: "06/2011",
    title: "BA (hons), University of Wales",
    description: "Studies (dropout)",
    tag: "personal",
  },
  {
    startDate: "05/2011",
    endDate: "12/2016",
    title: "Founder of Restaurant Day",
    description: "Created and led the world's largest food carnival",
    tag: "work",
  },
  {
    startDate: "12/2011",
    title: "Helsinki Cultural Achievement Award",
    description: "Recognition for cultural impact through Restaurant Day",
    tag: "random",
  },
  {
    startDate: "08/2016",
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
  },
  {
    startDate: "01/2018",
    endDate: "05/2022",
    title: "Business Development Director",
    description: "Led business development at ResQ Club",
    tag: "work",
  },
  {
    startDate: "01/2020",
    title: "Best Recruiting Campaign Nominee",
    description: "Nominated for the Best recruiting campaign in Finland",
    tag: "random",
  },
  {
    startDate: "01/2020",
    endDate: "04/2021",
    title: "Founder & Entrepreneur",
    description:
      "Jollaksen kartano - A ballroom in Helsinki hosting meetings, parties, and weddings",
    tag: "work",
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
];
