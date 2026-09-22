/**
 * DEMO STORIES — replace with real backend response later.
 *
 * Expected shape:
 * [
 *   {
 *     _id: string,
 *     user: { _id, username, fullName, profilePicture },
 *     items: [
 *       { _id: string, image: string, createdAt: ISO string }
 *     ]
 *   }
 * ]
 *
 * Rules for real backend:
 *  - Only return stories from users the current user follows
 *  - Backend should filter out expired items (24h+)
 *  - Sort items newest last (viewer plays them in order)
 */
export const demoStories = [
  // 👇 Uncomment this sample to test the UI now:
  // {
  //   _id: "story-1",
  //   user: {
  //     _id: "demo-user-1",
  //     username: "aman",
  //     fullName: "Aman Sharma",
  //     profilePicture: "https://i.pravatar.cc/150?u=aman",
  //   },
  //   items: [
  //     {
  //       _id: "item-1",
  //       image: "https://picsum.photos/500/900?random=1",
  //       createdAt: new Date().toISOString(),
  //     },
  //     {
  //       _id: "item-2",
  //       image: "https://picsum.photos/500/900?random=2",
  //       createdAt: new Date().toISOString(),
  //     },
  //   ],
  // },
  // {
  //   _id: "story-2",
  //   user: {
  //     _id: "demo-user-2",
  //     username: "sarthak",
  //     fullName: "Sarthak Ghoshal",
  //     profilePicture: "https://i.pravatar.cc/150?u=sarthak",
  //   },
  //   items: [
  //     {
  //       _id: "item-3",
  //       image: "https://picsum.photos/500/900?random=3",
  //       createdAt: new Date().toISOString(),
  //     },
  //   ],
  // },
];