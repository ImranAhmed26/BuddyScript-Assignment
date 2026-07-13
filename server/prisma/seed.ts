// Dev/demo seed: wipes data and creates sample users/posts/comments.
import { PrismaClient, type Visibility } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Separate client since this runs standalone via `prisma db seed`.
const prisma = new PrismaClient();

const PASSWORD = 'password123'; // shared demo password for all seeded users

async function main() {
  console.log('🌱 Seeding…');

  // Order respects FKs, though cascades would handle it.
  await prisma.commentLike.deleteMany();
  await prisma.postLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const people = [
    { firstName: 'Alice', lastName: 'Anderson', email: 'alice@buddyscript.dev' },
    { firstName: 'Bob', lastName: 'Brown', email: 'bob@buddyscript.dev' },
    { firstName: 'Carol', lastName: 'Clark', email: 'carol@buddyscript.dev' },
    { firstName: 'Dylan', lastName: 'Field', email: 'dylan@buddyscript.dev' },
  ];
  const users = await Promise.all(
    people.map((p) => prisma.user.create({ data: { ...p, passwordHash } })),
  );
  const [alice, bob, carol, dylan] = users;

  const posts = [
    { author: alice, content: 'Just shipped the Healthy Tracking App 🎉', visibility: 'PUBLIC' as Visibility },
    { author: bob, content: 'Weekend hiking trip was unreal.', visibility: 'PUBLIC' as Visibility },
    { author: carol, content: 'Draft thoughts — keeping these to myself for now.', visibility: 'PRIVATE' as Visibility },
    { author: dylan, content: 'Design systems are underrated. Change my mind.', visibility: 'PUBLIC' as Visibility },
    { author: alice, content: 'Private reminder: refactor the auth flow.', visibility: 'PRIVATE' as Visibility },
  ];

  for (const p of posts) {
    const post = await prisma.post.create({
      data: { authorId: p.author.id, content: p.content, visibility: p.visibility },
    });

    if (p.visibility === 'PUBLIC') {
      const likers = users.filter((u) => u.id !== p.author.id).slice(0, 2);
      await prisma.postLike.createMany({
        data: likers.map((u) => ({ userId: u.id, postId: post.id })),
      });

      const comment = await prisma.comment.create({
        data: { postId: post.id, authorId: bob.id, content: 'This is great, congrats!' },
      });
      await prisma.comment.create({
        data: { postId: post.id, authorId: p.author.id, parentId: comment.id, content: 'Thank you 🙏' },
      });
      await prisma.commentLike.create({ data: { userId: carol.id, commentId: comment.id } });

      await prisma.post.update({
        where: { id: post.id },
        data: { likeCount: likers.length, commentCount: 2 },
      });
      await prisma.comment.update({
        where: { id: comment.id },
        data: { likeCount: 1, replyCount: 1 },
      });
    }
  }

  console.log(`✅ Seeded ${users.length} users and ${posts.length} posts.`);
  console.log(`   Log in with any of: ${people.map((p) => p.email).join(', ')}`);
  console.log(`   Password for all: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
