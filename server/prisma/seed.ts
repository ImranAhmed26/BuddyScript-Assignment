import { PrismaClient, type Visibility } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'password123';

async function main() {
  console.log('🌱 Seeding…');

  // Clean slate (order respects FKs, though cascades would handle it).
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
      // A couple of likes from other users.
      const likers = users.filter((u) => u.id !== p.author.id).slice(0, 2);
      await prisma.postLike.createMany({
        data: likers.map((u) => ({ userId: u.id, postId: post.id })),
      });

      // One comment + one reply.
      const comment = await prisma.comment.create({
        data: { postId: post.id, authorId: bob.id, content: 'This is great, congrats!' },
      });
      await prisma.comment.create({
        data: { postId: post.id, authorId: p.author.id, parentId: comment.id, content: 'Thank you 🙏' },
      });
      await prisma.commentLike.create({ data: { userId: carol.id, commentId: comment.id } });

      // Fix up denormalized counters to match seeded rows.
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
