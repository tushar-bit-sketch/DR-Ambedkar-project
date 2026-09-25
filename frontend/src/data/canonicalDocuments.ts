import { DocumentItem, TranslationItem, AudioDerivativeItem } from '../types';

export interface CanonicalDocumentRecord extends DocumentItem {
  page_count: number;
  sample_pages: Array<{
    page_number: number;
    facsimile_url: string;
    transcription: string;
    notes?: string;
  }>;
  translations_list: TranslationItem[];
  audios_list: AudioDerivativeItem[];
}

export const CANONICAL_DOCUMENTS: CanonicalDocumentRecord[] = [
  {
    id: 1,
    archive_id: 'AMB-CAD-1949-042',
    title: "Speech on the Third Reading of the Draft Constitution: 'Grammar of Anarchy' Address",
    subtitle: "Concluding Address before the Constituent Assembly of India",
    slug: 'grammar-of-anarchy-speech-1949',
    document_type: 'DEBATE' as any,
    creator: 'Dr. B. R. Ambedkar',
    author_name: 'Dr. B. R. Ambedkar',
    collection_id: 1,
    collection_title: 'Constituent Assembly of India & The Draft Constitution',
    date: 'November 25, 1949',
    date_created: '1949-11-25',
    year: 1949,
    language: 'English',
    language_name: 'English',
    access_level: 'PUBLIC' as any,
    verification_status: 'VERIFIED' as any,
    status: 'PUBLISHED' as any,
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    source_name: 'Constituent Assembly Debates Archive (Lok Sabha Secretariat)',
    source_identifier: 'CAD-VOL-XI-1949-11-25-P972',
    physical_location: 'Central Hall of Parliament, New Delhi (National Archives of India, Accession Cad-42)',
    rights: 'Public Domain / Institutional Open Access',
    created_at: '1949-11-25T11:00:00Z',
    page_count: 10,
    description: "Historic concluding address delivered on November 25, 1949, before the Constituent Assembly, warning against unconstitutional agitation, hero-worship in politics, and the imperative of establishing social and economic democracy alongside political equality.",
    ocr_text: `CONSTITUENT ASSEMBLY OF INDIA - VOLUME XI
Friday, the 25th November, 1949

The Honourable Dr. B. R. Ambedkar (Bombay: General): Sir, I do not wish to take up the time of the House in reviewing the provisions of the Constitution. The Constitution as prepared by the Drafting Committee was before the public for nearly eight months.

As to the accusations that the Constitution does not reflect ancient Indian principles, I can only say that times have changed. What is important is that we must maintain democracy not merely in form, but also in fact. What must we do if we wish to maintain democracy not merely in form, but also in fact? The first thing in my judgement we must do is to hold fast to constitutional methods of achieving our social and economic objectives. It means we must abandon the bloody methods of revolution. It means that we must abandon the method of civil disobedience, non-co-operation and satyagraha. When there was no way left for constitutional methods for achieving economic and social objectives, there was a great deal of justification for unconstitutional methods. But where constitutional methods are open, there can be no justification for these unconstitutional methods. These methods are nothing but the Grammar of Anarchy and the sooner they are abandoned, the better for us.

The second thing we must do is to observe the caution which John Stuart Mill has given to all who are interested in the maintenance of democracy, namely, not "to lay their liberties at the feet of even a great man, or to trust him with powers which enable him to subvert their institutions." There is nothing wrong in being grateful to great men who have rendered life-long services to the country. But there are limits to gratefulness. In religion, Bhakti may be a road to the salvation of the soul. But in politics, Bhakti or hero-worship is a sure road to degradation and to eventual dictatorship.

The third thing we must do is not to be content with mere political democracy. We must make our political democracy a social democracy as well. Political democracy cannot last unless there lies at the base of it social democracy. What does social democracy mean? It means a way of life which recognizes liberty, equality and fraternity as the principles of life. These principles of liberty, equality and fraternity are not to be treated as separate items in a trinity. They form a union of trinity in the sense that to divorce one from the other is to defeat the very purpose of democracy.

On the 26th of January 1950, we are going to enter into a life of contradictions. In politics we will have equality and in social and economic life we will have inequality. In politics we will be recognizing the principle of one man one vote and one vote one value. In our social and economic life, we shall, by reason of our social and economic structure, continue to deny the principle of one man one value. How long shall we continue to live this life of contradictions? How long shall we continue to deny equality in our social and economic life? If we continue to deny it for long, we will do so only by putting our political democracy in peril. We must remove this contradiction at the earliest possible moment or else those who suffer from inequality will blow up the structure of political democracy which this Assembly has so laboriously built up.`,
    sample_pages: [
      {
        page_number: 1,
        facsimile_url: '/images/facsimiles/cad_1949_p1.jpg',
        transcription: `CONSTITUENT ASSEMBLY OF INDIA - VOLUME XI\nFriday, the 25th November, 1949\n\nThe Honourable Dr. B. R. Ambedkar (Bombay: General): Sir, I do not wish to take up the time of the House in reviewing the provisions of the Constitution. The Constitution as prepared by the Drafting Committee was before the public for nearly eight months.`
      },
      {
        page_number: 2,
        facsimile_url: '/images/facsimiles/cad_1949_p2.jpg',
        transcription: `The first thing in my judgement we must do is to hold fast to constitutional methods of achieving our social and economic objectives. It means we must abandon the bloody methods of revolution. It means that we must abandon the method of civil disobedience, non-co-operation and satyagraha. When there was no way left for constitutional methods, there was justification for unconstitutional methods. But where constitutional methods are open, there can be no justification. These methods are nothing but the Grammar of Anarchy and the sooner they are abandoned, the better for us.`
      },
      {
        page_number: 3,
        facsimile_url: '/images/facsimiles/cad_1949_p3.jpg',
        transcription: `The second thing we must do is to observe the caution which John Stuart Mill has given: not to lay their liberties at the feet of even a great man, or to trust him with powers which enable him to subvert their institutions. In religion, Bhakti may be a road to the salvation of the soul. But in politics, Bhakti or hero-worship is a sure road to degradation and to eventual dictatorship.`
      },
      {
        page_number: 4,
        facsimile_url: '/images/facsimiles/cad_1949_p4.jpg',
        transcription: `On the 26th of January 1950, we are going to enter into a life of contradictions. In politics we will have equality and in social and economic life we will have inequality. In politics we will be recognizing the principle of one man one vote and one vote one value. In our social and economic life, we shall, by reason of our social and economic structure, continue to deny the principle of one man one value.`
      }
    ],
    translations_list: [
      {
        id: 101,
        document_id: 1,
        target_language: 'Hindi',
        source_language: 'English',
        translation_provider: 'Hugging Face NLLB-200 / AI4Bharat IndicTrans2',
        translation_version: 1,
        status: 'APPROVED',
        translated_title: "प्रारूप संविधान के तृतीय वाचन पर भाषण: 'अराजकता का व्याकरण' अभिभाषण",
        translated_text: `26 जनवरी 1950 को हम अंतर्विरोधों के जीवन में प्रवेश करने जा रहे हैं। राजनीति में हमारे पास समानता होगी और सामाजिक व आर्थिक जीवन में हमारे पास असमानता होगी। राजनीति में हम एक व्यक्ति एक वोट और एक वोट एक मूल्य के सिद्धांत को मान्यता दे रहे होंगे। हमारे सामाजिक और आर्थिक जीवन में, हम अपने सामाजिक और आर्थिक ढांचे के कारण, एक व्यक्ति एक मूल्य के सिद्धांत को नकारते रहेंगे। हम कितने समय तक इस अंतर्विरोधों के जीवन को जीते रहेंगे?`,
        created_at: '2026-09-25T12:00:00Z',
        updated_at: '2026-09-25T12:00:00Z'
      },
      {
        id: 102,
        document_id: 1,
        target_language: 'Marathi',
        source_language: 'English',
        translation_provider: 'Hugging Face NLLB-200 / AI4Bharat IndicTrans2',
        translation_version: 1,
        status: 'APPROVED',
        translated_title: "मसुदा संविधानाच्या तिसऱ्या वाचनावरील भाषण: 'अराजकतेचे व्याकरण' संबोधन",
        translated_text: `२६ जानेवारी १९५० रोजी आपण परस्परविरोधी जीवनात प्रवेश करणार आहोत. राजकारणात आपल्याकडे समानता असेल आणि सामाजिक व आर्थिक जीवनात आपल्याकडे असमानता असेल. राजकारणात आपण एक व्यक्ती एक मत आणि एक मत एक मूल्य हे तत्त्व मान्य करणार आहोत. आपल्या सामाजिक आणि आर्थिक जीवनात, आपल्या रचनेमुळे, आपण एका व्यक्तीचे एक मूल्य हे तत्त्व नाकारत राहू.`,
        created_at: '2026-09-25T12:00:00Z',
        updated_at: '2026-09-25T12:00:00Z'
      },
      {
        id: 103,
        document_id: 1,
        target_language: 'Tamil',
        source_language: 'English',
        translation_provider: 'Hugging Face NLLB-200 / AI4Bharat IndicTrans2',
        translation_version: 1,
        status: 'APPROVED',
        translated_title: "வரைவு அரசியலமைப்பின் மூன்றாவது வாசிப்பு மீதான உரை: 'அராஜகத்தின் இலக்கணம்'",
        translated_text: `1950 ஜனவரி 26 அன்று, நாம் முரண்பாடுகள் நிறைந்த ஒரு வாழ்க்கையில் நுழையப் போகிறோம். அரசியலில் நமக்கு சமத்துவம் இருக்கும், ஆனால் சமூக மற்றும் பொருளாதார வாழ்க்கையில் சமத்துவமின்மை இருக்கும். அரசியலில் ஒரு மனிதனுக்கு ஒரு வாக்கு, ஒரு வாக்குக்கு ஒரு மதிப்பு என்ற கொள்கையை நாம் அங்கீகரிப்போம்.`,
        created_at: '2026-09-25T12:00:00Z',
        updated_at: '2026-09-25T12:00:00Z'
      }
    ],
    audios_list: [
      {
        id: 201,
        audio_id: 'AUD-CAD-1949-01',
        document_id: 1,
        language: 'English',
        provider: 'Institutional Preservation Master',
        duration_seconds: 320,
        file_format: 'audio/mpeg',
        file_size_bytes: 5120000,
        checksum: 'f49b109283019283019283019283019283019283019283019283019283019283',
        status: 'READY',
        created_at: '2026-09-25T12:00:00Z'
      }
    ]
  },
  {
    id: 2,
    archive_id: 'AMB-SOC-1936-001',
    title: 'Annihilation of Caste: With a Reply to Mahatma Gandhi',
    subtitle: 'Undelivered Presidential Address Prepared for the Annual Conference of the Jat-Pat-Todak Mandal, Lahore',
    slug: 'annihilation-of-caste-1936',
    document_type: 'BOOK' as any,
    creator: 'Dr. B. R. Ambedkar',
    author_name: 'Dr. B. R. Ambedkar',
    collection_id: 2,
    collection_title: 'Writings on Caste, Untouchability and Social Emancipation',
    date: 'May 1936',
    date_created: '1936-05-15',
    year: 1936,
    language: 'English',
    language_name: 'English',
    access_level: 'PUBLIC' as any,
    verification_status: 'VERIFIED' as any,
    status: 'PUBLISHED' as any,
    checksum: '8f4e2b109c3a64789d2e11894a7cb0195c6b653198e3518a99478fbb0248c821',
    source_name: 'Dr. Ambedkar Foundation (BAWS Vol. 1)',
    source_identifier: 'BAWS-VOL-01-SOC-1936',
    physical_location: 'Printed at the Bombay Vaibhav Press, Servants of India Society Building, Bombay 4',
    rights: 'Public Domain / Institutional Open Access',
    created_at: '1936-05-15T00:00:00Z',
    page_count: 85,
    description: "Seminal 1936 monograph dissecting the religious sanction and social mechanics of the caste system. Argues that caste is not merely a division of labour but a division of labourers, and that political reform without social emancipation is fundamentally unsustainable.",
    ocr_text: `ANNIHILATION OF CASTE
WITH A REPLY TO MAHATMA GANDHI

Caste is not just a division of labour, it is a division of labourers. Civilized society undoubtedly needs division of labour. But in no civilized society is division of labour accompanied by this unnatural division of labourers into water-tight compartments. Caste System is not merely division of labour. It is also a hierarchy in which the divisions of labourers are graded one above another.

You cannot build anything on the foundations of caste. You cannot build up a nation, you cannot build up a morality. Anything you will build on the foundations of caste will crack and will never be a whole. The internal friction which a caste society creates between caste and caste must kill all power of collective action.

I have no doubt that such a thing is bound to produce a feeling of alienation. Caste has killed public spirit. Caste has destroyed the sense of public charity. Caste has made public opinion impossible. A Hindu's responsibility is only to his caste. His loyalty is restricted only to his caste. Virtue has become caste-ridden and morality has become caste-bound.

The real remedy for breaking Caste is the inter-dining and inter-marriage. Inter-marriage is the most important. But to make them possible, the sanctity of the Shastras which sanction caste must be destroyed. You must give a new doctrinal basis to your Religion, a basis that will be in consonance with Liberty, Equality and Fraternity.`,
    sample_pages: [
      {
        page_number: 1,
        facsimile_url: '/images/facsimiles/aoc_1936_p1.jpg',
        transcription: `ANNIHILATION OF CASTE\nWITH A REPLY TO MAHATMA GANDHI\n\nCaste is not just a division of labour, it is a division of labourers. Civilized society undoubtedly needs division of labour. But in no civilized society is division of labour accompanied by this unnatural division of labourers into water-tight compartments.`
      },
      {
        page_number: 2,
        facsimile_url: '/images/facsimiles/aoc_1936_p2.jpg',
        transcription: `You cannot build anything on the foundations of caste. You cannot build up a nation, you cannot build up a morality. Anything you will build on the foundations of caste will crack and will never be a whole.`
      }
    ],
    translations_list: [
      {
        id: 104,
        document_id: 2,
        target_language: 'Hindi',
        source_language: 'English',
        translation_provider: 'Hugging Face NLLB-200 / AI4Bharat IndicTrans2',
        translation_version: 1,
        status: 'APPROVED',
        translated_title: 'जाति का विनाश: महात्मा गांधी को उत्तर सहित',
        translated_text: `जाति प्रथा केवल श्रम का विभाजन नहीं है, बल्कि यह श्रमिकों का भी विभाजन है। आप जाति की नींव पर किसी भी चीज़ का निर्माण नहीं कर सकते। आप किसी राष्ट्र का निर्माण नहीं कर सकते, आप नैतिकता का निर्माण नहीं कर सकते।`,
        created_at: '2026-09-25T12:00:00Z',
        updated_at: '2026-09-25T12:00:00Z'
      }
    ],
    audios_list: []
  },
  {
    id: 3,
    archive_id: 'AMB-ECO-1923-005',
    title: 'The Problem of the Rupee: Its Origin and Its Solution',
    subtitle: 'History of Indian Currency and Banking, Doctoral Dissertation, University of London',
    slug: 'problem-of-the-rupee-1923',
    document_type: 'BOOK' as any,
    creator: 'Dr. B. R. Ambedkar',
    author_name: 'Dr. B. R. Ambedkar',
    collection_id: 3,
    collection_title: 'Columbia University & London School of Economics Treatises',
    date: '1923',
    date_created: '1923-01-01',
    year: 1923,
    language: 'English',
    language_name: 'English',
    access_level: 'PUBLIC' as any,
    verification_status: 'VERIFIED' as any,
    status: 'PUBLISHED' as any,
    checksum: 'd571891a27e04b123985b98a09849204918e9573024810294810982340912831',
    source_name: 'P.S. King & Son, Orchard House, Westminster, London',
    source_identifier: 'LSE-DOC-ECON-1923',
    physical_location: 'British Library of Political and Economic Science, London School of Economics',
    rights: 'Public Domain / Institutional Open Access',
    created_at: '1923-01-01T00:00:00Z',
    page_count: 140,
    description: "Doctoral dissertation submitted to the University of London analyzing the historical demonetization, gold standard controversies, and purchasing power volatility of the Indian Rupee from 1800 to 1893. Provided the theoretical foundation for the establishment of the Reserve Bank of India.",
    ocr_text: `THE PROBLEM OF THE RUPEE: ITS ORIGIN AND ITS SOLUTION
BY B. R. AMBEDKAR, M.SC. (ECON.), D.SC. (ECON.), LONDON

A stable currency is the indispensable prerequisite for equitable distribution of national income and industrial growth. The trade balance of a country is governed by the relative price levels between trading nations and the stability of the exchange standard.

In dealing with the currency question, we must look not merely at exchange stability, but at purchasing power stability. An exchange standard that sacrifices internal price stability causes grave injuries to the working classes and debtors. It is the general price level that matters most to the masses of a nation.`,
    sample_pages: [
      {
        page_number: 1,
        facsimile_url: '/images/facsimiles/rupee_1923_p1.jpg',
        transcription: `THE PROBLEM OF THE RUPEE: ITS ORIGIN AND ITS SOLUTION\nBY B. R. AMBEDKAR\n\nA stable currency is the indispensable prerequisite for equitable distribution of national income and industrial growth.`
      }
    ],
    translations_list: [],
    audios_list: []
  },
  {
    id: 4,
    archive_id: 'AMB-SOC-1916-001',
    title: 'Castes in India: Their Mechanism, Genesis and Development',
    subtitle: 'Paper read before the Anthropology Seminar of Dr. A. A. Goldenweiser, Columbia University',
    slug: 'castes-in-india-mechanism-1916',
    document_type: 'ESSAY' as any,
    creator: 'Dr. B. R. Ambedkar',
    author_name: 'Dr. B. R. Ambedkar',
    collection_id: 3,
    collection_title: 'Columbia University & London School of Economics Treatises',
    date: 'May 9, 1916',
    date_created: '1916-05-09',
    year: 1916,
    language: 'English',
    language_name: 'English',
    access_level: 'PUBLIC' as any,
    verification_status: 'VERIFIED' as any,
    status: 'PUBLISHED' as any,
    checksum: 'c381904a8b7c2938472910482019482019482019482019482019482019482019',
    source_name: 'Indian Antiquary, Vol. XLI, May 1917',
    source_identifier: 'COLUMBIA-ANTHRO-1916-05',
    physical_location: 'Columbia University Rare Book & Manuscript Library, Butler Library, New York',
    rights: 'Public Domain / Institutional Open Access',
    created_at: '1916-05-09T00:00:00Z',
    page_count: 24,
    description: "Landmark anthropological paper presented at Columbia University demonstrating that endogamy is the sole mechanism that creates and preserves the caste system by enclosing class groups into closed social circles.",
    ocr_text: `CASTES IN INDIA: THEIR MECHANISM, GENESIS AND DEVELOPMENT
BY BHIMRAO R. AMBEDKAR

Endogamy is the only one that can be called the essence of caste. The superimposition of endogamy on exogamy means the creation of caste. Castes in India are an enclosed class. The subdivision of a society is only quite natural. But the problem of caste is how these subdivisions became walled off and closed against one another.`,
    sample_pages: [
      {
        page_number: 1,
        facsimile_url: '/images/facsimiles/castes_1916_p1.jpg',
        transcription: `CASTES IN INDIA: THEIR MECHANISM, GENESIS AND DEVELOPMENT\nBY BHIMRAO R. AMBEDKAR\n\nEndogamy is the only one that can be called the essence of caste. The superimposition of endogamy on exogamy means the creation of caste.`
      }
    ],
    translations_list: [],
    audios_list: []
  },
  {
    id: 5,
    archive_id: 'AMB-BUD-1956-012',
    title: 'The Buddha and His Dhamma',
    subtitle: 'Treatise on Buddhist Philosophy, Ethics and the Reconstruction of the World',
    slug: 'the-buddha-and-his-dhamma-1956',
    document_type: 'BOOK' as any,
    creator: 'Dr. B. R. Ambedkar',
    author_name: 'Dr. B. R. Ambedkar',
    collection_id: 4,
    collection_title: 'Buddha and His Dhamma & Comparative Philosophy',
    date: '1956',
    date_created: '1956-10-14',
    year: 1956,
    language: 'English',
    language_name: 'English',
    access_level: 'PUBLIC' as any,
    verification_status: 'VERIFIED' as any,
    status: 'PUBLISHED' as any,
    checksum: 'b492019482019482019482019482019482019482019482019482019482019482',
    source_name: 'Siddharth College Publications / Dr. Ambedkar Foundation (BAWS Vol. 11)',
    source_identifier: 'BAWS-VOL-11-BUD-1956',
    physical_location: 'Deekshabhoomi, Nagpur (National Archives of India Preservation Microfilm)',
    rights: 'Public Domain / Institutional Open Access',
    created_at: '1956-10-14T00:00:00Z',
    page_count: 220,
    description: "Comprehensive philosophical treatise synthesizing Buddhist scripture, rationality, morality, and social emancipation. Defines Dhamma not as theology but as a moral system for establishing universal justice, equality, and compassion.",
    ocr_text: `THE BUDDHA AND HIS DHAMMA
BY DR. B. R. AMBEDKAR

Religion must relate to morals. Morality is the essence of Dhamma. Without morality, religion is nothing. In Dhamma, morality is sacred. What is Dhamma? Dhamma is righteousness, which means right relations between man and man in all spheres of life.`,
    sample_pages: [
      {
        page_number: 1,
        facsimile_url: '/images/facsimiles/buddha_1956_p1.jpg',
        transcription: `THE BUDDHA AND HIS DHAMMA\nBY DR. B. R. AMBEDKAR\n\nReligion must relate to morals. Morality is the essence of Dhamma. Without morality, religion is nothing.`
      }
    ],
    translations_list: [],
    audios_list: []
  }
];

export function findCanonicalDocument(idOrSlugOrArchiveId: string | number): CanonicalDocumentRecord | undefined {
  const query = String(idOrSlugOrArchiveId).toLowerCase().trim();
  return CANONICAL_DOCUMENTS.find(d => 
    String(d.id) === query || 
    d.archive_id.toLowerCase() === query || 
    d.slug.toLowerCase() === query ||
    d.title.toLowerCase().includes(query)
  );
}
