import { prisma } from '../src/lib/prisma';
import { bootstrapAdminAccount } from '../src/lib/account-admission';
import { buildTransformerAcademicBundle } from '../src/lib/magic-import';

async function main() {
  console.log('1. Bootstrapping Admin account (Jack Huang)...');
  const { user: admin } = await bootstrapAdminAccount({
    email: process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@gizmo.local',
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'AdminPassword123!',
    name: process.env.BOOTSTRAP_ADMIN_NAME || 'Jack Huang',
  });

  // Ensure a second classmate account exists for leaderboards & study groups
  const sofiaEmail = 'sofia@nyp.edu.sg';
  const sofia = await prisma.user.upsert({
    where: { normalizedEmail: sofiaEmail },
    update: {},
    create: {
      email: sofiaEmail,
      normalizedEmail: sofiaEmail,
      name: 'Sofia Tan',
      handle: 'SofiaBioScholar88',
      schoolName: 'Nanyang Polytechnic',
      role: 'CREATOR',
      status: 'ACTIVE',
      xp: 480,
      gems: 820,
      hearts: 5,
      hints: 12,
      streakDays: 9,
      beltRank: 'Yellow Belt',
    },
  });

  const liamEmail = 'liam@nyp.edu.sg';
  const liam = await prisma.user.upsert({
    where: { normalizedEmail: liamEmail },
    update: {},
    create: {
      email: liamEmail,
      normalizedEmail: liamEmail,
      name: 'Liam Chen',
      handle: 'QuantumLiam42',
      schoolName: 'Nanyang Polytechnic',
      role: 'USER',
      status: 'ACTIVE',
      xp: 310,
      gems: 540,
      hearts: 5,
      hints: 8,
      streakDays: 5,
      beltRank: 'Yellow Belt',
    },
  });

  console.log('2. Seeding Transformer Academic Paper Deck & Study Note for Admin...');
  const existingTransformerDeck = await prisma.deck.findFirst({
    where: { ownerId: admin.id, title: 'attention is all you need' },
  });

  if (!existingTransformerDeck) {
    const bundle = buildTransformerAcademicBundle(
      'attention-is-all-you-need.pdf',
      'bdfaa68d8984f0dc02beaca527b76f207d99b666d31d1da728ee0728182df697',
      'Attention Is All You Need (Vaswani et al.) — Transformer Sequence-to-Sequence Architecture.'
    );

    const deck = await prisma.deck.create({
      data: {
        title: bundle.title,
        description: bundle.summary,
        category: 'Computer Science',
        level: 'University',
        color: '#7C3AED',
        icon: '🤖',
        isPublic: true,
        ownerId: admin.id,
      },
    });

    const importMat = await prisma.importMaterial.create({
      data: {
        deckId: deck.id,
        ownerId: admin.id,
        filename: 'attention-is-all-you-need.pdf',
        mimeType: 'application/pdf',
        sourceType: 'PDF',
        fileHashSha256: bundle.fileHashSha256,
        extractedText: bundle.extractedText,
      },
    });

    const note = await prisma.studyNote.create({
      data: {
        deckId: deck.id,
        ownerId: admin.id,
        title: bundle.noteTitle,
        summary: bundle.summary,
        contentMarkdown: bundle.noteMarkdown,
        sourceType: 'PDF',
        sourceFilename: 'attention-is-all-you-need.pdf',
      },
    });

    const chat = await prisma.aiTutorChat.create({
      data: {
        ownerId: admin.id,
        deckId: deck.id,
        importMaterialId: importMat.id,
        noteId: note.id,
        title: bundle.title,
        summary: bundle.summary,
        lessonStepsJson: JSON.stringify(bundle.lessonSteps),
      },
    });

    await prisma.aiTutorMessage.createMany({
      data: [
        {
          chatId: chat.id,
          role: 'user',
          content: 'Uploaded academic PDF: attention-is-all-you-need.pdf',
          attachmentName: 'attention-is-all-you-need.pdf',
          attachmentType: 'PDF',
        },
        {
          chatId: chat.id,
          role: 'assistant',
          content: bundle.summary,
          suggestedActionsJson: JSON.stringify([
            { id: 'memorize', title: 'Memorize', subtitle: 'Generate flashcards', cta: 'Start memorizing' },
            { id: 'note', title: 'Note', subtitle: 'Generate a note', cta: 'Generate note' },
            { id: 'lesson', title: 'Step-by-step lesson', subtitle: bundle.title, cta: 'Start lesson' },
          ]),
        },
      ],
    });

    for (const sd of bundle.subdecks) {
      const subdeck = await prisma.subdeck.create({
        data: {
          deckId: deck.id,
          title: sd.title,
          orderIndex: sd.orderIndex,
          masteryScore: sd.orderIndex === 0 ? 35 : 0,
        },
      });
      for (const c of sd.cards) {
        await prisma.card.create({
          data: {
            deckId: deck.id,
            subdeckId: subdeck.id,
            question: c.question,
            answer: c.answer,
            clozeText: c.clozeText,
            optionsJson: JSON.stringify(c.options),
            explanation: c.explanation,
            cardType: c.cardType,
          },
        });
      }
    }
  }

  console.log('3. Seeding Public Community Decks (Biology, Physics, Math, History, Languages)...');
  const publicDecksData = [
    {
      title: 'sec 3 biology',
      description: 'Cellular Transport, Mitochondria & Vacuoles, Enzymology, Digestive System & Cardiac Cycle.',
      category: 'Biology',
      level: 'High School / GCSE',
      color: '#16A34A',
      icon: '🧬',
      ownerId: sofia.id,
      subdecks: [
        {
          title: 'Cellular Transport',
          cards: [
            {
              question: 'What is the net movement of water molecules across a partially permeable membrane called?',
              answer: 'Osmosis',
              clozeText: '{{Osmosis}} is the net movement of water molecules down a water potential gradient.',
              options: ['Osmosis', 'Active transport', 'Endocytosis'],
              explanation: 'Osmosis moves water molecules from a region of higher water potential to lower water potential through a selectively permeable membrane without ATP.',
              cardType: 'MCQ',
            },
            {
              question: 'Which process requires energy from ATP to move ions against a concentration gradient?',
              answer: 'Active transport',
              clozeText: '{{Active transport}} uses ATP to pump molecules against their concentration gradient.',
              options: ['Simple diffusion', 'Active transport', 'Osmosis'],
              explanation: 'Active transport relies on carrier proteins and cellular respiration (ATP) to transport solutes from low to high concentration.',
              cardType: 'MCQ',
            },
          ],
        },
        {
          title: 'Mitochondria & Vacuoles',
          cards: [
            {
              question: 'Which organelle is the primary site of aerobic respiration and ATP synthesis?',
              answer: 'Mitochondrion',
              clozeText: 'The {{Mitochondrion}} has folded cristae that maximize surface area for ATP synthesis.',
              options: ['Mitochondrion', 'Golgi apparatus', 'Ribosome'],
              explanation: 'Mitochondria oxidize glucose metabolites via the Krebs cycle and oxidative phosphorylation to generate ATP.',
              cardType: 'MCQ',
            },
          ],
        },
      ],
    },
    {
      title: 'Quantum Mechanics & Electromagnetism',
      description: 'Wave-particle duality, Schrödinger equation, Maxwell equations, and relativistic electrodynamics.',
      category: 'Physics',
      level: 'University',
      color: '#2563EB',
      icon: '⚛️',
      ownerId: liam.id,
      subdecks: [
        {
          title: 'Wave-Particle Duality & De Broglie Wavelength',
          cards: [
            {
              question: 'What relates a particle’s wavelength lambda to its momentum p via Planck’s constant h?',
              answer: 'lambda = h / p',
              clozeText: 'The de Broglie relation states that {{lambda = h / p}}.',
              options: ['lambda = h / p', 'E = m c^2', 'F = q(E + v x B)'],
              explanation: 'Louis de Broglie proposed that matter exhibits wave-like properties with wavelength inversely proportional to momentum.',
              cardType: 'MCQ',
            },
          ],
        },
      ],
    },
    {
      title: 'Linear Algebra & Multivariable Calculus',
      description: 'Eigenvalues, SVD, Jacobian matrices, gradient descent, and chain rule in neural networks.',
      category: 'Mathematics',
      level: 'University',
      color: '#D97706',
      icon: '📐',
      ownerId: sofia.id,
      subdecks: [
        {
          title: 'Eigenvalues & Singular Value Decomposition',
          cards: [
            {
              question: 'For a square matrix A, a non-zero vector v satisfying Av = lambda v is called an _.',
              answer: 'eigenvector',
              clozeText: 'A non-zero vector v satisfying Av = lambda v is an {{eigenvector}}.',
              options: ['eigenvector', 'orthogonal complement', 'Hessian'],
              explanation: 'Linear transformations only scale eigenvectors by their corresponding scalar eigenvalue lambda.',
              cardType: 'CLOZE',
            },
          ],
        },
      ],
    },
    {
      title: 'Macroeconomics & Monetary Policy',
      description: 'IS-LM framework, central bank interest rates, inflation targeting, and fiscal multipliers.',
      category: 'Economics',
      level: 'University',
      color: '#EC4899',
      icon: '📈',
      ownerId: liam.id,
      subdecks: [
        {
          title: 'Central Banking & Inflation',
          cards: [
            {
              question: 'According to the Fisher equation, nominal interest rate i equals approximately _.',
              answer: 'real interest rate r + inflation pi',
              clozeText: 'The Fisher equation states i ≈ {{real interest rate r + inflation pi}}.',
              options: ['real interest rate r + inflation pi', 'GDP divided by money velocity', 'marginal propensity to consume'],
              explanation: 'The Fisher relation links nominal rates, real rates, and expected inflation.',
              cardType: 'MCQ',
            },
          ],
        },
      ],
    },
    {
      title: 'JLPT N4 Japanese Vocabulary & Grammar',
      description: 'Essential Japanese verbs, particles, polite/plain forms, and kanji reading flashcards.',
      category: 'Languages',
      level: 'Intermediate',
      color: '#E11D48',
      icon: '🗾',
      ownerId: sofia.id,
      subdecks: [
        {
          title: 'Essential Verbs & Particles',
          cards: [
            {
              question: 'What does the Japanese verb 考える (kangaeru) mean in English?',
              answer: 'To think / consider',
              clozeText: '考える (kangaeru) means {{To think / consider}}.',
              options: ['To think / consider', 'To run quickly', 'To forget'],
              explanation: '考える (kangaeru) is an ichidan verb meaning to think carefully or consider.',
              cardType: 'MCQ',
            },
          ],
        },
      ],
    },
  ];

  for (const pd of publicDecksData) {
    const exists = await prisma.deck.findFirst({
      where: { title: pd.title },
    });
    if (!exists) {
      const createdDeck = await prisma.deck.create({
        data: {
          title: pd.title,
          description: pd.description,
          category: pd.category,
          level: pd.level,
          color: pd.color,
          icon: pd.icon,
          isPublic: true,
          ownerId: pd.ownerId,
        },
      });
      for (let i = 0; i < pd.subdecks.length; i++) {
        const sd = pd.subdecks[i];
        const createdSub = await prisma.subdeck.create({
          data: {
            deckId: createdDeck.id,
            title: sd.title,
            orderIndex: i,
            masteryScore: 60,
          },
        });
        for (const c of sd.cards) {
          await prisma.card.create({
            data: {
              deckId: createdDeck.id,
              subdeckId: createdSub.id,
              question: c.question,
              answer: c.answer,
              clozeText: c.clozeText,
              optionsJson: JSON.stringify(c.options),
              explanation: c.explanation,
              cardType: c.cardType,
            },
          });
        }
      }
    }
  }

  console.log('4. Seeding Study Group & Initial Live Game Session...');
  const group = await prisma.studyGroup.upsert({
    where: { inviteCode: 'NYP-AI-2026' },
    update: {},
    create: {
      name: 'NYP Deep Learning & Biology Squad',
      description: 'Sharing Transformer notes, arXiv paper decks, and Sec 3/Poly exam flashcards!',
      schoolName: 'Nanyang Polytechnic',
      inviteCode: 'NYP-AI-2026',
      emoji: '🚀',
    },
  });

  for (const u of [admin, sofia, liam]) {
    await prisma.studyGroupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: u.id } },
      update: {},
      create: {
        groupId: group.id,
        userId: u.id,
        role: u.id === admin.id ? 'OWNER' : 'MEMBER',
      },
    });
  }

  const msgCount = await prisma.studyGroupMessage.count({ where: { groupId: group.id } });
  if (msgCount === 0) {
    await prisma.studyGroupMessage.createMany({
      data: [
        {
          groupId: group.id,
          userId: sofia.id,
          content: 'Hey everyone! I just shared the Attention Is All You Need & Sec 3 Biology decks for our Friday quiz battle!',
        },
        {
          groupId: group.id,
          userId: liam.id,
          content: 'Awesome! The Scaled Dot-Product Attention subdeck on the Study Path is super clear.',
        },
      ],
    });
  }

  console.log('Seed completed successfully.');
}

main().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
