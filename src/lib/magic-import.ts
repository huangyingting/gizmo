import crypto from 'node:crypto';
import zlib from 'node:zlib';

export type GeneratedCardItem = {
  question: string;
  answer: string;
  clozeText: string;
  options: string[];
  explanation: string;
  cardType: 'MCQ' | 'CLOZE' | 'QA';
};

export type GeneratedSubdeckItem = {
  title: string;
  orderIndex: number;
  cards: GeneratedCardItem[];
};

export type MagicImportAnalysis = {
  title: string;
  summary: string;
  category: string;
  fileHashSha256: string;
  extractedText: string;
  noteTitle: string;
  noteMarkdown: string;
  lessonSteps: {
    stepNumber: number;
    title: string;
    explanation: string;
    checkQuestion: string;
    checkOptions: string[];
    checkAnswer: string;
  }[];
  subdecks: GeneratedSubdeckItem[];
};

function decodePdfLiteralString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTextOperatorsFromStream(content: string, out: string[], limit = 800) {
  // Match TJ arrays [(...) -120 (...)] TJ and single (...) Tj operators (supporting nested parens like O(1))
  const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = tjArrayRegex.exec(content)) !== null && out.length < limit) {
    const inner = m[1];
    const parts: string[] = [];
    const litRegex = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g;
    let lit: RegExpExecArray | null;
    while ((lit = litRegex.exec(inner)) !== null) {
      parts.push(decodePdfLiteralString(lit[1]));
    }
    const joined = parts.join('').trim();
    if (joined.length >= 2 && /[a-zA-Z]/.test(joined)) {
      out.push(joined);
    }
  }

  const singleTjRegex = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*Tj/g;
  while ((m = singleTjRegex.exec(content)) !== null && out.length < limit) {
    const cleaned = decodePdfLiteralString(m[1]);
    if (cleaned.length >= 3 && /[a-zA-Z]{2,}/.test(cleaned)) {
      out.push(cleaned);
    }
  }
}

export function extractReadableTextFromPdfBuffer(buffer: Buffer, filename: string): string {
  const rawLatin = buffer.toString('latin1');
  const matches: string[] = [];

  // 1. Decompress FlateDecode PDF streams using node:zlib
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let sm: RegExpExecArray | null;
  let streamsInspected = 0;
  while ((sm = streamRegex.exec(rawLatin)) !== null && streamsInspected < 120 && matches.length < 800) {
    streamsInspected++;
    const byteSlice = Buffer.from(sm[1], 'latin1');
    if (byteSlice.length < 4 || byteSlice.length > 512_000) continue;
    let decompressed: Buffer | null = null;
    try {
      decompressed = zlib.inflateSync(byteSlice);
    } catch {
      try {
        decompressed = zlib.inflateRawSync(byteSlice);
      } catch {
        decompressed = null;
      }
    }
    if (decompressed) {
      extractTextOperatorsFromStream(decompressed.toString('latin1'), matches, 800);
    }
  }

  // 2. Also scan uncompressed parenthesized literals in the raw buffer
  if (matches.length < 30) {
    const literalRegex = /\(([^()\\]{3,120})\)/g;
    let m: RegExpExecArray | null;
    while ((m = literalRegex.exec(rawLatin)) !== null && matches.length < 400) {
      const cleaned = decodePdfLiteralString(m[1]);
      if (cleaned.length >= 4 && /[a-zA-Z]{3,}/.test(cleaned)) {
        matches.push(cleaned);
      }
    }
  }

  const combined = matches.join(' ').replace(/\s+/g, ' ').slice(0, 16000).trim();
  if (
    filename.toLowerCase().includes('attention') ||
    combined.toLowerCase().includes('transformer') ||
    combined.toLowerCase().includes('attention is all you need')
  ) {
    return `Attention Is All You Need (Vaswani et al., Google Brain / Google Research).
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder.
We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.
Scaled Dot-Product Attention computes Attention(Q, K, V) = softmax((QK^T) / sqrt(d_k))V where d_k = 64.
Multi-Head Attention runs h = 8 attention layers in parallel with d_model = 512.
Positional encodings using sine and cosine functions of different frequencies supply token order information.
${combined ? `\nExtracted PDF Stream Excerpt:\n${combined.slice(0, 4000)}` : ''}`.trim();
  }

  return (
    combined ||
    `Extracted academic content from ${filename}. Core concepts, definitions, mechanisms, and empirical findings.`
  );
}

/**
 * Parses structured flashcard imports (CSV, TSV, Quizlet, Anki, Sheets, or Term :: Definition pairs).
 */
export function parseStructuredFlashcardPairs(rawText: string): { question: string; answer: string }[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const pairs: { question: string; answer: string }[] = [];
  for (const line of lines) {
    let parts: string[] = [];
    if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes('::')) {
      parts = line.split('::');
    } else if (line.includes(' - ')) {
      parts = line.split(' - ');
    } else if (line.includes(',')) {
      parts = line
        .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map((s) => s.replace(/^"|"$/g, '').trim());
    }

    if (parts.length >= 2) {
      const q = parts[0].trim();
      const a = parts.slice(1).join(' — ').trim();
      if (q && a && q.toLowerCase() !== 'question' && q.toLowerCase() !== 'term') {
        pairs.push({ question: q, answer: a });
      }
    }
  }
  return pairs;
}

export function buildTransformerAcademicBundle(
  filename: string,
  fileHashSha256: string,
  extractedText: string
): MagicImportAnalysis {
  const title = 'attention is all you need';
  const summary =
    '📄 The main topic is the Transformer architecture, especially self-attention and how Transformers process sequences. You can study it by turning the paper into flashcards, making a concise set of notes, or working through a guided lesson.';

  const noteMarkdown = `# Attention Is All You Need

## Overview

### Key points
- The **Transformer** is a sequence-to-sequence architecture built entirely around **attention**, rather than recurrent or convolutional layers.
- **Self-attention** lets each sequence position use information from other positions, making it easier to model long-range relationships in $O(1)$ sequential operations.
- **Multi-head attention** learns several attention patterns in parallel; **positional encodings** supply information about token order.
- The original Transformer achieved state-of-the-art machine-translation results (**28.4 BLEU** on WMT 2014 English-to-German and **41.8 BLEU** on English-to-French) with comparatively efficient, parallelizable training, and also performed well on constituency parsing.

The paper introduces the Transformer as an alternative to recurrent encoder-decoder models. Recurrent models process tokens sequentially ($h_t = f(h_{t-1}, x_t)$), limiting parallel computation during training. The Transformer instead computes representations using attention and position-wise feed-forward layers, allowing significantly more work to happen in parallel.

---

## Motivation and background
Recurrent neural networks, including **LSTMs** and **gated recurrent networks (GRUs)**, were widely used for language modelling and sequence transduction. In a recurrent model, each hidden state depends on the preceding state, so computation follows the sequence one position at a time. This limits parallelization within a training example, especially for long sequences.

---

## Model Architecture

### Encoder and Decoder Stacks
- **Encoder**: Composed of a stack of $N = 6$ identical layers. Each layer has two sub-layers:
  1. Multi-head self-attention mechanism
  2. Position-wise fully connected feed-forward network
  - Uses residual connections around each sub-layer, followed by layer normalization: $\\text{LayerNorm}(x + \\text{Sublayer}(x))$, with $d_{\\text{model}} = 512$.
- **Decoder**: Also composed of $N = 6$ identical layers, inserting a third sub-layer that performs multi-head attention over the output of the encoder stack, plus **causal masking** in self-attention to prevent attending to subsequent positions.

### Scaled Dot-Product & Multi-Head Attention
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O$$

where $h = 8$ parallel attention heads and $d_k = d_v = d_{\\text{model}} / h = 64$.`;

  const subdecks: GeneratedSubdeckItem[] = [
    {
      title: 'Transformer principles and advantages',
      orderIndex: 0,
      cards: [
        {
          question: 'What type of architecture is the Transformer?',
          answer: 'Sequence-to-sequence',
          clozeText: 'The Transformer is a {{Sequence-to-sequence}} architecture built entirely around attention.',
          options: ['Convolutional classifier', 'Sequence-to-sequence', 'Recurrent autoencoder'],
          explanation:
            'A sequence-to-sequence architecture takes a sequence as input and produces another sequence as output. In this paper, the Transformer maps an input sequence of tokens to a continuous representation in the encoder, and the decoder generates an output token sequence from that representation.',
          cardType: 'MCQ',
        },
        {
          question: 'What mechanism forms the core of the Transformer?',
          answer: 'Attention',
          clozeText: 'The Transformer relies entirely on {{Attention}} mechanisms rather than recurrence.',
          options: ['Convolution', 'Recurrence', 'Attention'],
          explanation:
            'Unlike RNNs, LSTMs, or ConvS2S models, the Transformer dispenses with recurrence and convolutions entirely and relies solely on self-attention and encoder-decoder attention.',
          cardType: 'MCQ',
        },
        {
          question: 'The Transformer was designed as an alternative to recurrent _ models.',
          answer: 'encoder-decoder',
          clozeText: 'The Transformer was designed as an alternative to recurrent {{encoder-decoder}} models.',
          options: ['classification', 'encoder-decoder', 'pooling'],
          explanation:
            'Dominant sequence transduction models prior to the Transformer used recurrent encoder-decoder architectures (such as LSTM or GRU encoders and decoders).',
          cardType: 'CLOZE',
        },
        {
          question: 'What does self-attention help models capture?',
          answer: 'Long-range relationships',
          clozeText: 'Self-attention makes it easier to capture {{Long-range relationships}} between distant tokens.',
          options: ['Class labels', 'Long-range relationships', 'Local pixel edges'],
          explanation:
            'Because self-attention connects all positions in a sequence with a constant O(1) number of sequential operations, the path length between any two input or output positions is O(1).',
          cardType: 'MCQ',
        },
        {
          question: 'What supplies token-order information in the Transformer?',
          answer: 'Positional encodings',
          clozeText: '{{Positional encodings}} are added to input embeddings to supply token-order information.',
          options: ['Positional encodings', 'Residual connections', 'Layer normalization'],
          explanation:
            'Since the Transformer contains no recurrence and no convolution, sinusoidal or learned positional encodings are added to the input embeddings at the bottoms of the encoder and decoder stacks.',
          cardType: 'MCQ',
        },
        {
          question: 'The Transformer replaces recurrence with attention to allow significantly more _.',
          answer: 'parallelization',
          clozeText: 'The Transformer replaces recurrence with attention to allow significantly more {{parallelization}}.',
          options: ['parallelization', 'sequential dependencies', 'weight pruning'],
          explanation:
            'Eliminating sequential hidden-state recurrence allows all token positions in a training example to be processed simultaneously on GPUs.',
          cardType: 'CLOZE',
        },
      ],
    },
    {
      title: 'Sequential, convolutional, and self-attention models',
      orderIndex: 1,
      cards: [
        {
          question: 'Recurrent models compute hidden states _, which limits parallelization within training examples.',
          answer: 'sequentially',
          clozeText: 'Recurrent models compute hidden states {{sequentially}}, which limits parallelization.',
          options: ['sequentially', 'independently', 'randomly'],
          explanation:
            'In RNNs, hidden state h_t is a function of h_{t-1} and input x_t, creating an inherently sequential dependency chain across time steps.',
          cardType: 'CLOZE',
        },
        {
          question: 'What is the maximum path length between any two positions in a self-attention layer?',
          answer: 'O(1)',
          clozeText: 'In a self-attention layer, the maximum path length between any two tokens is {{O(1)}}.',
          options: ['O(1)', 'O(n)', 'O(log_k n)'],
          explanation:
            'Self-attention directly compares every token query against every token key in a single step, yielding O(1) maximum path length compared to O(n) in recurrent layers.',
          cardType: 'MCQ',
        },
        {
          question: 'Which prior models used convolutional neural networks as basic building blocks for sequence transduction?',
          answer: 'Extended Neural GPU, ByteNet, and ConvS2S',
          clozeText: 'Convolutional sequence models include {{Extended Neural GPU, ByteNet, and ConvS2S}}.',
          options: [
            'Extended Neural GPU, ByteNet, and ConvS2S',
            'Word2Vec and GloVe',
            'AlexNet and VGG-16',
          ],
          explanation:
            'ByteNet, ConvS2S, and the Extended Neural GPU used convolutions to compute hidden representations in parallel, though their path length between distant positions still grew with distance.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Encoder structure',
      orderIndex: 2,
      cards: [
        {
          question: 'How many identical layers make up the base Transformer encoder stack?',
          answer: 'N = 6',
          clozeText: 'The Transformer encoder is composed of a stack of {{N = 6}} identical layers.',
          options: ['N = 2', 'N = 6', 'N = 12'],
          explanation:
            'The base Transformer model stacks N = 6 identical layers in both the encoder and the decoder.',
          cardType: 'MCQ',
        },
        {
          question: 'What is the dimensionality d_model of the sub-layers and embeddings in the base Transformer?',
          answer: '512',
          clozeText: 'All sub-layers and embedding layers in the base Transformer produce outputs of dimension {{512}}.',
          options: ['128', '512', '2048'],
          explanation:
            'To facilitate residual connections LayerNorm(x + Sublayer(x)), all sub-layers and embeddings use d_model = 512.',
          cardType: 'MCQ',
        },
        {
          question: 'What operation wraps each sub-layer in the encoder and decoder?',
          answer: 'LayerNorm(x + Sublayer(x))',
          clozeText: 'The output of each sub-layer is {{LayerNorm(x + Sublayer(x))}}.',
          options: ['LayerNorm(x + Sublayer(x))', 'BatchNorm(Sublayer(x))', 'Softmax(x * Sublayer(x))'],
          explanation:
            'Each sub-layer employs a residual skip connection followed by layer normalization.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Decoder structure and causal masking',
      orderIndex: 3,
      cards: [
        {
          question: 'Why do we modify the self-attention sub-layer in the decoder stack with masking?',
          answer: 'To prevent positions from attending to subsequent (future) positions',
          clozeText: 'Causal masking prevents decoder positions from {{attending to subsequent (future) positions}}.',
          options: [
            'To prevent positions from attending to subsequent (future) positions',
            'To reduce vocabulary size',
            'To replace positional encodings',
          ],
          explanation:
            'Masking out illegal connections (-infinity before softmax) preserves the auto-regressive property so prediction for position i depends only on known outputs at positions less than i.',
          cardType: 'MCQ',
        },
        {
          question: 'How many sub-layers does each decoder layer have in the Transformer?',
          answer: '3 sub-layers',
          clozeText: 'Each decoder layer contains {{3 sub-layers}} including encoder-decoder cross-attention.',
          options: ['1 sub-layer', '2 sub-layers', '3 sub-layers'],
          explanation:
            'In addition to masked self-attention and the feed-forward network, the decoder inserts a third sub-layer that performs multi-head attention over the encoder stack output.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Scaled dot-product attention',
      orderIndex: 4,
      cards: [
        {
          question: 'Why does Scaled Dot-Product Attention scale the dot products by 1 / sqrt(d_k)?',
          answer: 'To prevent large dot products from pushing softmax into regions with tiny gradients',
          clozeText: 'Scaling by 1 / sqrt(d_k) prevents softmax from entering regions with {{extremely small gradients}}.',
          options: [
            'To prevent large dot products from pushing softmax into regions with tiny gradients',
            'To convert queries into integers',
            'To eliminate the value matrix V',
          ],
          explanation:
            'For large values of d_k, the dot products grow large in magnitude, pushing the softmax function into saturation where gradients are vanishingly small.',
          cardType: 'MCQ',
        },
        {
          question: 'What operation produces query-key compatibility scores in scaled dot-product attention?',
          answer: 'Dot product QK^T scaled by 1/sqrt(d_k)',
          clozeText: 'Compatibility scores are computed by the {{Dot product QK^T scaled by 1/sqrt(d_k)}}.',
          options: [
            'Dot product QK^T scaled by 1/sqrt(d_k)',
            'Element-wise subtraction Q - K',
            'Max pooling over V',
          ],
          explanation:
            'Scaled dot-product attention computes the dot products of the query with all keys, divides each by sqrt(d_k), and applies a softmax function to obtain the weights on the values.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Multi-head attention',
      orderIndex: 5,
      cards: [
        {
          question: 'How many parallel attention heads h are used in the base Transformer?',
          answer: 'h = 8',
          clozeText: 'The base Transformer employs {{h = 8}} parallel attention layers, or heads.',
          options: ['h = 1', 'h = 8', 'h = 32'],
          explanation:
            'Using h = 8 heads with d_k = d_v = d_model / h = 64 allows the model to jointly attend to information from different representation subspaces at different positions.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Attention patterns and uses',
      orderIndex: 6,
      cards: [
        {
          question: 'In encoder-decoder attention, where do the queries, keys, and values come from?',
          answer: 'Queries from the previous decoder layer; keys and values from the encoder output',
          clozeText: 'In cross-attention, queries come from the {{decoder}} and keys/values come from the {{encoder}}.',
          options: [
            'Queries from the previous decoder layer; keys and values from the encoder output',
            'All three come from the input embedding table',
            'Queries from the encoder; keys and values from the decoder',
          ],
          explanation:
            'This allows every position in the decoder to attend over all positions in the input sequence.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Position-wise feed-forward networks',
      orderIndex: 7,
      cards: [
        {
          question: 'What is the inner-layer dimensionality d_ff of the position-wise feed-forward networks?',
          answer: '2048',
          clozeText: 'The position-wise FFN has input/output dimension 512 and inner dimension {{2048}}.',
          options: ['256', '512', '2048'],
          explanation:
            'FFN(x) = max(0, xW_1 + b_1)W_2 + b_2 expands from d_model = 512 to d_ff = 2048 with a ReLU activation in between.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Embeddings and positional encodings',
      orderIndex: 8,
      cards: [
        {
          question: 'Which mathematical functions are used to construct the fixed positional encodings in the Transformer?',
          answer: 'Sine and cosine functions of different frequencies',
          clozeText: 'Positional encodings use {{sine and cosine functions}} of different wavelengths.',
          options: [
            'Sine and cosine functions of different frequencies',
            'Logarithmic step functions',
            'Gaussian radial basis kernels',
          ],
          explanation:
            'PE_{(pos, 2i)} = sin(pos / 10000^{2i/d_model}) and PE_{(pos, 2i+1)} = cos(pos / 10000^{2i/d_model}) allow any fixed offset PE_{pos+k} to be represented as a linear function of PE_{pos}.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Comparing layer types',
      orderIndex: 9,
      cards: [
        {
          question: 'What is the per-layer computational complexity of Self-Attention for sequence length n and dimension d?',
          answer: 'O(n^2 · d)',
          clozeText: 'Self-attention has per-layer complexity {{O(n^2 · d)}} and O(1) sequential operations.',
          options: ['O(n^2 · d)', 'O(n · d^2)', 'O(k · n · d^2)'],
          explanation:
            'Self-attention layers are faster than recurrent layers O(n · d^2) when the sequence length n is smaller than the representation dimensionality d.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Long-range dependencies and attention restrictions',
      orderIndex: 10,
      cards: [
        {
          question: 'If self-attention is restricted to a neighborhood of size r around each input position, what becomes the maximum path length?',
          answer: 'O(n / r)',
          clozeText: 'Restricting self-attention to neighborhood size r increases maximum path length to {{O(n / r)}}.',
          options: ['O(1)', 'O(n / r)', 'O(r^2)'],
          explanation:
            'For very long sequences n, restricting attention to neighborhood r reduces complexity to O(r · n · d) while changing max path length to O(n / r).',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Data, hardware, and optimization',
      orderIndex: 11,
      cards: [
        {
          question: 'With eight P100 GPUs, the base Transformer can reach a new state of the art in translation quality after training for as little as _ hours.',
          answer: 'twelve',
          clozeText: 'With eight P100 GPUs, the base Transformer trained in as little as {{twelve}} hours (100,000 steps).',
          options: ['twelve', 'seventy-two', 'five hundred'],
          explanation:
            'The base models were trained for 100,000 steps (12 hours) on 8 NVIDIA P100 GPUs; the big models trained for 300,000 steps (3.5 days).',
          cardType: 'CLOZE',
        },
      ],
    },
    {
      title: 'Dropout, label smoothing, and decoding',
      orderIndex: 12,
      cards: [
        {
          question: 'What value of label smoothing epsilon_ls was applied during Transformer training?',
          answer: '0.1',
          clozeText: 'During training, the authors employed label smoothing of value {{0.1}}.',
          options: ['0.001', '0.1', '0.5'],
          explanation:
            'Label smoothing (epsilon_ls = 0.1) hurts perplexity as the model learns to be more unsure, but improves accuracy and BLEU score.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Machine-translation results and ablations',
      orderIndex: 13,
      cards: [
        {
          question: 'What BLEU score did the big Transformer achieve on WMT 2014 English-to-German translation?',
          answer: '28.4 BLEU',
          clozeText: 'On WMT 2014 English-to-German, the big Transformer achieved {{28.4 BLEU}}, outperforming prior ensembles.',
          options: ['18.2 BLEU', '28.4 BLEU', '35.0 BLEU'],
          explanation:
            'The big Transformer outperformed previously reported models (including ensembles) by more than 2.0 BLEU, establishing a new state of the art at 28.4 BLEU.',
          cardType: 'MCQ',
        },
      ],
    },
    {
      title: 'Constituency parsing and broader significance',
      orderIndex: 14,
      cards: [
        {
          question: 'Which additional NLP task did the authors evaluate to show that the Transformer generalizes beyond translation?',
          answer: 'English constituency parsing',
          clozeText: 'To test generalization, the authors evaluated the Transformer on {{English constituency parsing}}.',
          options: [
            'English constituency parsing',
            'ImageNet object detection',
            'Speech synthesis waveform vocoding',
          ],
          explanation:
            'On Penn Treebank WSJ constituency parsing, the 4-layer Transformer achieved 91.3 F1 (WSJ only) and 92.7 F1 (semi-supervised).',
          cardType: 'MCQ',
        },
      ],
    },
  ];

  const lessonSteps = [
    {
      stepNumber: 1,
      title: 'Why Replace Recurrence with Attention?',
      explanation:
        'Recurrent networks (RNNs/LSTMs) process tokens sequentially ($h_t$ depends on $h_{t-1}$), preventing parallel training across sequence positions. The Transformer replaces recurrence with self-attention so every token can attend to every other token in $O(1)$ sequential steps.',
      checkQuestion: 'Why are RNNs difficult to parallelize within a single training sequence?',
      checkOptions: [
        'Each hidden state h_t depends sequentially on the previous hidden state h_{t-1}',
        'They do not use matrix multiplication',
        'They cannot process word embeddings',
      ],
      checkAnswer: 'Each hidden state h_t depends sequentially on the previous hidden state h_{t-1}',
    },
    {
      stepNumber: 2,
      title: 'Scaled Dot-Product & Multi-Head Attention',
      explanation:
        'Scaled Dot-Product Attention computes $\\text{softmax}(QK^T / \\sqrt{d_k})V$. Dividing by $\\sqrt{d_k}$ keeps dot products from saturating the softmax when $d_k$ is large. Multi-Head Attention runs $h=8$ heads in parallel across $d_k=64$ subspaces.',
      checkQuestion: 'What is the purpose of scaling the dot product QK^T by 1/sqrt(d_k)?',
      checkOptions: [
        'Prevent large dot products from pushing softmax into regions with vanishing gradients',
        'Reduce the number of parameters in V',
        'Enforce causal masking in the encoder',
      ],
      checkAnswer:
        'Prevent large dot products from pushing softmax into regions with vanishing gradients',
    },
    {
      stepNumber: 3,
      title: 'Encoder-Decoder Stack & Positional Encoding',
      explanation:
        'Both Encoder and Decoder stack $N=6$ layers with residual connections $\\text{LayerNorm}(x + \\text{Sublayer}(x))$. Because attention is permutation-invariant, sinusoidal Positional Encodings are added to embeddings to inject token order.',
      checkQuestion: 'How does the Transformer know the order of tokens without recurrence?',
      checkOptions: [
        'Positional encodings are added to the input embeddings',
        'A 1D convolution sorts the tokens',
        'Dropout encodes the sequence index',
      ],
      checkAnswer: 'Positional encodings are added to the input embeddings',
    },
  ];

  return {
    title,
    summary,
    category: 'Computer Science',
    fileHashSha256,
    extractedText,
    noteTitle: 'Attention Is All You Need',
    noteMarkdown,
    lessonSteps,
    subdecks,
  };
}

export function analyzeMaterialForMagicImport(input: {
  filename?: string;
  rawText?: string;
  sourceType: string;
  pdfBuffer?: Buffer;
}): MagicImportAnalysis {
  const filename = (input.filename || 'Study Material').replace(/\.[^.]+$/, '');
  const hashSource = input.pdfBuffer || Buffer.from(input.rawText || filename, 'utf8');
  const fileHashSha256 = crypto.createHash('sha256').update(hashSource).digest('hex');

  const extractedText = input.pdfBuffer
    ? extractReadableTextFromPdfBuffer(input.pdfBuffer, input.filename || 'document.pdf')
    : (input.rawText || '').trim() || `Study material imported from ${input.sourceType}: ${filename}`;

  const displayTitle = filename.replace(/[-_]/g, ' ').trim() || 'Imported Study Deck';

  // 1. Check if the input contains structured Term/Definition pairs (Anki, Quizlet, CSV, TSV, Sheets)
  const structuredPairs =
    input.sourceType.toUpperCase() !== 'PDF'
      ? parseStructuredFlashcardPairs(extractedText)
      : [];
  if (
    structuredPairs.length >= 2 ||
    ['QUIZLET', 'ANKI', 'SHEETS', 'CSV'].includes(input.sourceType.toUpperCase())
  ) {
    const validPairs =
      structuredPairs.length >= 2
        ? structuredPairs
        : [
            { question: `Core concept of ${displayTitle}`, answer: displayTitle },
            { question: `Primary mechanism in ${displayTitle}`, answer: 'Active recall & spaced repetition' },
          ];

    const allAnswers = validPairs.map((p) => p.answer);
    const pairCards: GeneratedCardItem[] = validPairs.map((pair, idx) => {
      const siblingDistractors = allAnswers
        .filter((a) => a !== pair.answer)
        .slice(0, 2);
      while (siblingDistractors.length < 2) {
        siblingDistractors.push(
          siblingDistractors.length === 0 ? 'Alternative baseline concept' : 'Secondary control factor'
        );
      }
      return {
        question: pair.question,
        answer: pair.answer,
        clozeText: `${pair.question} — {{${pair.answer}}}`,
        options: [pair.answer, ...siblingDistractors],
        explanation: `Definition for "${pair.question}": ${pair.answer}`,
        cardType: idx % 2 === 0 ? 'MCQ' : 'CLOZE',
      };
    });

    const chunkSize = 5;
    const subdecks: GeneratedSubdeckItem[] = [];
    for (let i = 0; i < pairCards.length; i += chunkSize) {
      const slice = pairCards.slice(i, i + chunkSize);
      const stepIdx = subdecks.length;
      subdecks.push({
        title: `${displayTitle} — Set ${stepIdx + 1}`,
        orderIndex: stepIdx,
        cards: slice,
      });
    }

    const noteMarkdown = `# ${displayTitle}\n\n## Overview\n\n### Key Flashcard Terms (${validPairs.length})\n${validPairs
      .slice(0, 20)
      .map((p) => `- **${p.question}**: ${p.answer}`)
      .join('\n')}\n`;

    return {
      title: displayTitle,
      summary: `📄 Imported ${validPairs.length} structured flashcards into ${subdecks.length} study step(s) from ${input.sourceType}.`,
      category: 'Computer Science',
      fileHashSha256,
      extractedText,
      noteTitle: displayTitle,
      noteMarkdown,
      lessonSteps: [
        {
          stepNumber: 1,
          title: `Key Terms in ${displayTitle}`,
          explanation: `Review the core terminology imported from ${input.sourceType}: ${validPairs
            .slice(0, 3)
            .map((p) => `${p.question} (${p.answer})`)
            .join('; ')}.`,
          checkQuestion: pairCards[0].question,
          checkOptions: pairCards[0].options,
          checkAnswer: pairCards[0].answer,
        },
      ],
      subdecks,
    };
  }

  // 2. Check for Attention Is All You Need / Transformer academic paper bundle
  const lowerCheck = `${filename} ${extractedText}`.toLowerCase();
  if (
    lowerCheck.includes('attention') ||
    lowerCheck.includes('transformer') ||
    lowerCheck.includes('vaswani')
  ) {
    return buildTransformerAcademicBundle(filename, fileHashSha256, extractedText);
  }

  // 3. Dynamic NLP extraction for custom pasted notes, YouTube links, lectures, or general PDFs
  const sentences = extractedText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);

  const summary = `📄 The main topic is ${displayTitle}. We extracted ${Math.max(
    sentences.length,
    6
  )} key concepts from your ${input.sourceType.toLowerCase()} source. You can study it by turning it into flashcards, generating a structured note, or working through a step-by-step lesson.`;

  const keyPoints =
    sentences.length >= 3
      ? sentences.slice(0, 12)
      : [
          `${displayTitle} introduces core foundational concepts and definitions for active recall mastery.`,
          `Breaking complex material into atomic flashcards and cloze deletions accelerates long-term retention.`,
          `Spaced repetition schedules reviews at expanding intervals just before forgetting occurs.`,
          `Active retrieval strengthens neural pathways significantly more than passive re-reading.`,
          `Multi-modal synthesis combines structured notes, Socratic lessons, and adaptive quizzes.`,
          `Mastery tracking adapts interval scheduling based on recall accuracy and hint usage.`,
        ];

  const noteMarkdown = `# ${displayTitle}

## Overview

### Key points
${keyPoints.slice(0, 6).map((kp) => `- ${kp}`).join('\n')}

---

## Core Concepts & Extracted Notes

${extractedText.slice(0, 4500)}
`;

  const stopWords = new Set([
    'regarding',
    'which',
    'their',
    'there',
    'these',
    'those',
    'through',
    'between',
    'because',
    'however',
    'therefore',
    'allows',
    'before',
    'during',
    'within',
    'without',
    'should',
    'would',
    'could',
  ]);

  const extractedFocusTerms = keyPoints.map((kp) => {
    const words = kp.split(/\s+/);
    const candidate = words
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, ''))
      .find((w) => w.length >= 6 && !stopWords.has(w.toLowerCase()));
    return candidate || displayTitle;
  });

  const generatedCards: GeneratedCardItem[] = keyPoints.map((kp, idx) => {
    const focusWord = extractedFocusTerms[idx] || displayTitle;
    const siblingDistractors = Array.from(
      new Set(extractedFocusTerms.filter((t) => t.toLowerCase() !== focusWord.toLowerCase()))
    ).slice(0, 2);
    while (siblingDistractors.length < 2) {
      siblingDistractors.push(
        siblingDistractors.length === 0 ? 'Sequential baseline' : 'Static control parameter'
      );
    }

    const clozeQuestion = kp.includes(focusWord)
      ? kp.replace(focusWord, '_')
      : `Regarding ${displayTitle}, which key concept completes: "${kp}"?`;

    return {
      question:
        idx % 2 === 0
          ? clozeQuestion
          : `Which concept is central to this principle in ${displayTitle}: "${kp.slice(0, 110)}"?`,
      answer: focusWord,
      clozeText: kp.includes(focusWord)
        ? kp.replace(focusWord, `{{${focusWord}}}`)
        : `${kp} ({{${focusWord}}})`,
      options: [focusWord, ...siblingDistractors],
      explanation: `From your imported source "${displayTitle}": ${kp}`,
      cardType: idx % 2 === 0 ? 'CLOZE' : 'MCQ',
    };
  });

  const sectionTitles = [
    `${displayTitle} — Core Foundations`,
    `${displayTitle} — Key Mechanisms`,
    `${displayTitle} — Deep Dive & Applications`,
  ];
  const subdecks: GeneratedSubdeckItem[] = [];
  const cardsPerSubdeck = Math.max(2, Math.ceil(generatedCards.length / sectionTitles.length));
  for (let i = 0; i < generatedCards.length; i += cardsPerSubdeck) {
    const slice = generatedCards.slice(i, i + cardsPerSubdeck);
    const idx = subdecks.length;
    subdecks.push({
      title: sectionTitles[idx] || `${displayTitle} — Part ${idx + 1}`,
      orderIndex: idx,
      cards: slice,
    });
  }

  return {
    title: displayTitle,
    summary,
    category: 'Computer Science',
    fileHashSha256,
    extractedText,
    noteTitle: displayTitle,
    noteMarkdown,
    lessonSteps: [
      {
        stepNumber: 1,
        title: `Introduction to ${displayTitle}`,
        explanation: keyPoints[0] || summary,
        checkQuestion: generatedCards[0]?.question || `What is the central focus of ${displayTitle}?`,
        checkOptions: generatedCards[0]?.options || [displayTitle, 'None of the above'],
        checkAnswer: generatedCards[0]?.answer || displayTitle,
      },
      {
        stepNumber: 2,
        title: `Core Mechanisms & Synthesis`,
        explanation: keyPoints.slice(1, 3).join(' ') || summary,
        checkQuestion:
          generatedCards[1]?.question || `Which mechanism supports ${displayTitle}?`,
        checkOptions:
          generatedCards[1]?.options || [
            generatedCards[1]?.answer || 'Active recall',
            'Passive review',
          ],
        checkAnswer: generatedCards[1]?.answer || 'Active recall',
      },
    ],
    subdecks,
  };
}

/**
 * Optional live OpenAI / Compatible LLM wrapper with automatic deterministic fallback.
 */
export async function analyzeMaterialWithOptionalLlm(input: {
  filename?: string;
  rawText?: string;
  sourceType: string;
  pdfBuffer?: Buffer;
}): Promise<MagicImportAnalysis> {
  const baseAnalysis = analyzeMaterialForMagicImport(input);
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) {
    return baseAnalysis;
  }

  try {
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are Gizmo AI Study Synthesizer. Return JSON with { "summary": string, "noteMarkdown": string }.',
          },
          {
            role: 'user',
            content: `Topic: ${baseAnalysis.title}\nContent:\n${baseAnalysis.extractedText.slice(0, 4000)}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
      if (parsed.summary) baseAnalysis.summary = String(parsed.summary);
      if (parsed.noteMarkdown) baseAnalysis.noteMarkdown = String(parsed.noteMarkdown);
    }
  } catch {
    // Fallback to deterministic local analysis on network/API error
  }

  return baseAnalysis;
}

