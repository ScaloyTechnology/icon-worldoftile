--
-- PostgreSQL database dump
--

\restrict Nf8TL3dWhJtGa5aYyO6V6VI8KQtiVlD5iseZjKKAwYkAnDtjUNRSdQJyqUyxYNb

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-09-25 13:28:59

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 886 (class 1247 OID 67490)
-- Name: AttributeKind; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AttributeKind" AS ENUM (
    'FINISH',
    'SURFACE',
    'COLOUR',
    'LOOK',
    'MATERIAL',
    'ROOM',
    'USAGE',
    'CUSTOM'
);


ALTER TYPE public."AttributeKind" OWNER TO postgres;

--
-- TOC entry 889 (class 1247 OID 67508)
-- Name: EnquiryStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EnquiryStatus" AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'CLOSED',
    'SPAM'
);


ALTER TYPE public."EnquiryStatus" OWNER TO postgres;

--
-- TOC entry 883 (class 1247 OID 67483)
-- Name: PublishState; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."PublishState" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


ALTER TYPE public."PublishState" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 67548)
-- Name: AdminSession; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminSession" (
    id text NOT NULL,
    "tokenHash" text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUsedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AdminSession" OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 67463)
-- Name: AdminUser; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AdminUser" (
    id text NOT NULL,
    email character varying(191) NOT NULL,
    name character varying(120) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "roleId" text NOT NULL,
    "lastLoginAt" timestamp(3) without time zone
);


ALTER TABLE public."AdminUser" OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 67765)
-- Name: Application; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Application" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    introduction text,
    state public."PublishState" DEFAULT 'DRAFT'::public."PublishState" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Application" OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 67647)
-- Name: AttributeDefinition; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AttributeDefinition" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    kind public."AttributeKind" NOT NULL,
    filterable boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."AttributeDefinition" OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 67662)
-- Name: AttributeValue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AttributeValue" (
    id text NOT NULL,
    "definitionId" text NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."AttributeValue" OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 67800)
-- Name: Catalogue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Catalogue" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    "coverId" text,
    "pdfId" text,
    state public."PublishState" DEFAULT 'DRAFT'::public."PublishState" NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "emailCaptureRequired" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Catalogue" OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 67619)
-- Name: Collection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Collection" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    state public."PublishState" DEFAULT 'DRAFT'::public."PublishState" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "coverMediaId" text,
    "heroMediaId" text,
    "homepageOrder" integer DEFAULT 0 NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Collection" OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 67917)
-- Name: Enquiry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Enquiry" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text NOT NULL,
    status public."EnquiryStatus" DEFAULT 'NEW'::public."EnquiryStatus" NOT NULL,
    "consentAt" timestamp(3) without time zone NOT NULL,
    "consentVersion" text NOT NULL,
    "productId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Enquiry" OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 67561)
-- Name: LoginThrottle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LoginThrottle" (
    key text NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LoginThrottle" OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 67572)
-- Name: MediaAsset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MediaAsset" (
    id text NOT NULL,
    "storageKey" text NOT NULL,
    "sourcePath" text,
    "originalFilename" text NOT NULL,
    "mimeType" text NOT NULL,
    "byteSize" bigint NOT NULL,
    width integer,
    height integer,
    alt text NOT NULL,
    sha256 text,
    approved boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MediaAsset" OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 67526)
-- Name: Permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    key text NOT NULL
);


ALTER TABLE public."Permission" OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 67590)
-- Name: Product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    state public."PublishState" DEFAULT 'DRAFT'::public."PublishState" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "seoId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "homepageHeroEligible" boolean DEFAULT false NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "previewMediaId" text,
    "primaryTextureId" text
);


ALTER TABLE public."Product" OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 67675)
-- Name: ProductAttribute; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductAttribute" (
    "productId" text NOT NULL,
    "valueId" text NOT NULL
);


ALTER TABLE public."ProductAttribute" OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 67636)
-- Name: ProductCollection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductCollection" (
    "productId" text NOT NULL,
    "collectionId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ProductCollection" OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 67717)
-- Name: ProductImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductImage" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "mediaId" text NOT NULL,
    role text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ProductImage" OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 67695)
-- Name: ProductVariant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProductVariant" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "sizeId" text NOT NULL,
    sku text,
    "variantKey" text NOT NULL,
    "thicknessMm" numeric(6,2),
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ProductVariant" OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 67853)
-- Name: Project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Project" (
    id text NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    introduction text,
    architect text,
    location text,
    state public."PublishState" DEFAULT 'DRAFT'::public."PublishState" NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "categoryId" text,
    "applicationId" text,
    "seoId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Project" OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 67843)
-- Name: ProjectCategory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProjectCategory" (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);


ALTER TABLE public."ProjectCategory" OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 67870)
-- Name: ProjectImage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ProjectImage" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    "mediaId" text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ProjectImage" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 67517)
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 67535)
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RolePermission" (
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL
);


ALTER TABLE public."RolePermission" OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 67964)
-- Name: SeoMetadata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SeoMetadata" (
    id text NOT NULL,
    title text,
    description text,
    "canonicalPath" text,
    "socialImageKey" text,
    "noIndex" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."SeoMetadata" OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 67949)
-- Name: SiteContent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SiteContent" (
    id text NOT NULL,
    "sectionId" text NOT NULL,
    locale text DEFAULT 'en'::text NOT NULL,
    payload jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SiteContent" OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 67935)
-- Name: SiteSection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SiteSection" (
    id text NOT NULL,
    page text NOT NULL,
    key text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    state public."PublishState" DEFAULT 'DRAFT'::public."PublishState" NOT NULL
);


ALTER TABLE public."SiteSection" OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 67684)
-- Name: Size; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Size" (
    id text NOT NULL,
    label text NOT NULL,
    "widthMm" numeric(8,2) NOT NULL,
    "lengthMm" numeric(8,2) NOT NULL
);


ALTER TABLE public."Size" OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 67441)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- TOC entry 5193 (class 0 OID 67548)
-- Dependencies: 224
-- Data for Name: AdminSession; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminSession" (id, "tokenHash", "userId", "expiresAt", "createdAt", "lastUsedAt") FROM stdin;
cmugfbivx0000b4eqjzls9ubp	cf810b7e34d2428d658e1039add4b2db6135e032525f25555a19da86937f3e85	cmu199b0x0000ageqez8earou	2026-09-25 11:51:10.913	2026-09-25 03:51:10.941	2026-09-25 05:11:05.851
\.


--
-- TOC entry 5189 (class 0 OID 67463)
-- Dependencies: 220
-- Data for Name: AdminUser; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AdminUser" (id, email, name, "passwordHash", "createdAt", "updatedAt", active, "roleId", "lastLoginAt") FROM stdin;
cmu199b0x0000ageqez8earou	icon.world@gmail.com	Icon@World	$2b$12$OKVovmPqYn9WM7DBcHDTnOHrVlwmumLXRAD62Fb48K9dTra.DkLpq	2026-09-14 13:04:57.105	2026-09-25 03:51:10.949	t	role_super_admin	2026-09-25 03:51:10.913
\.


--
-- TOC entry 5205 (class 0 OID 67765)
-- Dependencies: 236
-- Data for Name: Application; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Application" (id, slug, name, introduction, state, "sortOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- TOC entry 5199 (class 0 OID 67647)
-- Dependencies: 230
-- Data for Name: AttributeDefinition; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AttributeDefinition" (id, slug, name, kind, filterable, "sortOrder") FROM stdin;
cmufk0xn9000160eqcfgguszn	product-application	Application	USAGE	t	0
cmufk0xpo000860equ6eojl09	look-and-feel	Look & feel	LOOK	t	1
cmufk0xr7000h60eqw8xijk9a	colours	Colours	COLOUR	t	2
cmufk0xt7000s60eqk26m1set	surface	Surface	SURFACE	t	3
\.


--
-- TOC entry 5200 (class 0 OID 67662)
-- Dependencies: 231
-- Data for Name: AttributeValue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AttributeValue" (id, "definitionId", slug, label, "sortOrder") FROM stdin;
cmufk0xof000360eqsix64zzg	cmufk0xn9000160eqcfgguszn	elevation	Elevation	1
cmufk0xoe000260eqndy1iyrk	cmufk0xn9000160eqcfgguszn	flooring	Flooring	0
cmufk0xoi000660eqwaashtea	cmufk0xn9000160eqcfgguszn	subway	Subway	4
cmufk0xoh000560eqad5ctpmt	cmufk0xn9000160eqcfgguszn	wall	Wall	3
cmufk0xog000460eqzsrwrwar	cmufk0xn9000160eqcfgguszn	parking	Parking	2
cmufk0xok000760eqpgqjwlpg	cmufk0xn9000160eqcfgguszn	countertop	Countertop	5
cmufk0xq1000960eqoy2ch1i0	cmufk0xpo000860equ6eojl09	marble	Marble	0
cmufk0xq1000a60eqssgtrm44	cmufk0xpo000860equ6eojl09	wood	Wood	1
cmufk0xq2000b60eq80y1tkkt	cmufk0xpo000860equ6eojl09	fabric	Fabric	2
cmufk0xq3000c60eq5zibdgnt	cmufk0xpo000860equ6eojl09	plain	Plain	3
cmufk0xq5000d60eqvyaox744	cmufk0xpo000860equ6eojl09	metallic	Metallic	4
cmufk0xq6000e60eqvbr6pr74	cmufk0xpo000860equ6eojl09	stone	Stone	5
cmufk0xq7000f60eqkh8dzgd4	cmufk0xpo000860equ6eojl09	concrete	Concrete	6
cmufk0xq8000g60eq71ddkh8t	cmufk0xpo000860equ6eojl09	decor	Decor	7
cmufk0xrs000j60eqd02e5rbs	cmufk0xr7000h60eqw8xijk9a	beige	Beige	1
cmufk0xrt000k60eqzovr51xd	cmufk0xr7000h60eqw8xijk9a	cream	Cream	2
cmufk0xrr000i60eqm17q66xb	cmufk0xr7000h60eqw8xijk9a	white	White	0
cmufk0xrt000l60eq0llth0t0	cmufk0xr7000h60eqw8xijk9a	pink	Pink	3
cmufk0xru000m60eqad4xlnpc	cmufk0xr7000h60eqw8xijk9a	blue	Blue	4
cmufk0xru000n60eqhxk07a63	cmufk0xr7000h60eqw8xijk9a	green	Green	5
cmufk0xrv000o60eqzcubbq62	cmufk0xr7000h60eqw8xijk9a	orange	Orange	6
cmufk0xrw000p60eqdm0fc7yc	cmufk0xr7000h60eqw8xijk9a	grey	Grey	7
cmufk0xrw000q60eq1n6t2ttm	cmufk0xr7000h60eqw8xijk9a	brown	Brown	8
cmufk0xrx000r60eqybbz0xvz	cmufk0xr7000h60eqw8xijk9a	black	Black	9
cmufk0xva000t60eqzdr3jfql	cmufk0xt7000s60eqk26m1set	matt	Matt	0
cmufk0xvb000u60eqwflt4t7i	cmufk0xt7000s60eqk26m1set	high-gloss	High gloss	1
cmufk0xve000v60eqsj16j7if	cmufk0xt7000s60eqk26m1set	carving	Carving	2
cmufk0xvg000w60equ5te7ap5	cmufk0xt7000s60eqk26m1set	double-digital	Double digital	3
cmufk0xvi000x60eq719rnpi4	cmufk0xt7000s60eqk26m1set	gvt	GVT	4
cmufk0xvj000y60eqoxzanmg5	cmufk0xt7000s60eqk26m1set	pgvt	PGVT	5
cmufk0xvj000z60eqo9row6sw	cmufk0xt7000s60eqk26m1set	fullbody	Fullbody	6
cmufk0xvk001060eqpjclgcfj	cmufk0xt7000s60eqk26m1set	porcelain	Porcelain	7
\.


--
-- TOC entry 5206 (class 0 OID 67800)
-- Dependencies: 237
-- Data for Name: Catalogue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Catalogue" (id, slug, title, "coverId", "pdfId", state, "publishedAt", "emailCaptureRequired", "createdAt", "updatedAt") FROM stdin;
cmuggizsp0003b4eqsqnyn0ko	ghf	test	cmuggipab0001b4eqysc130m2	cmuggiypd0002b4eqw478ulih	PUBLISHED	2026-09-25 04:24:59.064	t	2026-09-25 04:24:59.065	2026-09-25 04:24:59.065
\.


--
-- TOC entry 5197 (class 0 OID 67619)
-- Dependencies: 228
-- Data for Name: Collection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Collection" (id, slug, name, description, state, "sortOrder", "createdAt", "updatedAt", "coverMediaId", "heroMediaId", "homepageOrder", "isFeatured") FROM stdin;
cmu9y8vuf000164eqpr8swzbe	test	Test Collection	Testing admin frontend connection	PUBLISHED	1	2026-09-20 15:06:37.239	2026-09-23 14:21:48.481	cmu9zxqgp000264eqefukdzhh	\N	1	t
\.


--
-- TOC entry 5210 (class 0 OID 67917)
-- Dependencies: 241
-- Data for Name: Enquiry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Enquiry" (id, name, email, phone, message, status, "consentAt", "consentVersion", "productId", "createdAt", "updatedAt") FROM stdin;
cmuf36jam00017geqtqbgc5np	Hemay Patel	hemay.patel.05@gmail.com	33344455566	[Project consultation]\n\nwant to check my kitchen size and tile collections	NEW	2026-09-24 05:23:36.621	public-contact-v1	\N	2026-09-24 05:23:36.623	2026-09-24 05:23:36.623
\.


--
-- TOC entry 5194 (class 0 OID 67561)
-- Dependencies: 225
-- Data for Name: LoginThrottle; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LoginThrottle" (key, attempts, "expiresAt") FROM stdin;
global	1	2026-09-25 04:06:10.359
account:27617da8d2f3297b4558d2fbd5b789f69380de88f7e9c16f076bfa4ca0aa6364	1	2026-09-25 04:06:10.548
\.


--
-- TOC entry 5195 (class 0 OID 67572)
-- Dependencies: 226
-- Data for Name: MediaAsset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MediaAsset" (id, "storageKey", "sourcePath", "originalFilename", "mimeType", "byteSize", width, height, alt, sha256, approved, "createdAt", "updatedAt") FROM stdin;
cmu9zxqgp000264eqefukdzhh	assets/home/product-showcase/cotto-gold.webp	public/assets/home/product-showcase/cotto-gold.webp	cotto-gold.webp	image/webp	182202	\N	\N	test 1	\N	t	2026-09-20 15:53:56.282	2026-09-20 15:53:56.282
cmucbzex50005vkequl64tc7h	media/uploads/products/51bfe457-5e06-4880-990d-982a3c2ba7aa.jpg	admin-upload:cmu199b0x0000ageqez8earou	AQUA_STONE_GRAPHITE.jpg	image/jpeg	19713606	\N	\N	AQUA_STONE_GRAPHITE	c49328b5d4a09c222e6259ae73a657b4770862442b65912e37c5d324dd1784f2	t	2026-09-22 07:06:42.378	2026-09-22 07:06:42.378
cmucc0p4e0006vkeqzq4wl9yh	media/uploads/products/9b2481d7-1a4c-481f-968c-5f8e6ecd67d6.jpg	admin-upload:cmu199b0x0000ageqez8earou	ARTICA IVORY.jpg	image/jpeg	14967470	\N	\N	ARTICA IVORY	b7c338783709908b772fb909039d90aab7541bb8cdc01e72d68fe6f5a4fcf6f8	t	2026-09-22 07:07:42.255	2026-09-22 07:07:42.255
cmucc0sb40007vkeqizzx8z5f	media/uploads/products/e3fd1d18-6a12-42f5-869c-99e739c09950.jpg	admin-upload:cmu199b0x0000ageqez8earou	COTTO OLIVE PREVIEW.jpg	image/jpeg	9441324	\N	\N	COTTO OLIVE PREVIEW	7702bc0a0f12b36343f94e8ff4a45f0613b0b0d123733664931d4663b8d67070	t	2026-09-22 07:07:46.384	2026-09-22 07:07:46.384
cmudx29yd00006weqjrdvluwr	media/uploads/products/8e6ccea6-e834-45bc-938e-2d3456e183d6.jpg	admin-upload:cmu199b0x0000ageqez8earou	AUSTIN_WHITE.jpg	image/jpeg	47994495	\N	\N	AUSTIN_WHITE	0f68c6ce4f4d4f2160f95b4eb7148dd86cddba68eac946c2281ee58da069981b	t	2026-09-23 09:44:34.022	2026-09-23 09:44:34.022
cmudx2l4m00016weqbh920fs8	media/uploads/products/f1d9ef27-b22f-4ae1-823d-e2f92040c59c.jpg	admin-upload:cmu199b0x0000ageqez8earou	ARTICA SILVER+GRAPHITE.jpg	image/jpeg	14363011	\N	\N	ARTICA SILVER+GRAPHITE	f1f7623382e8c3393a52ef0d6c8964274008fbf33c13af1835d06dff1b7c1fa6	t	2026-09-23 09:44:48.502	2026-09-23 09:44:48.502
cmudx2m9r00026weq1syw4oot	media/uploads/products/6b703664-92be-4c1f-910b-1e5019916c5d.jpg	admin-upload:cmu199b0x0000ageqez8earou	COTTO RED + AURUM TACO.jpg	image/jpeg	22044303	\N	\N	COTTO RED + AURUM TACO	efb33b95d60c50ad8e70be7768bd8e504d59cb9ea3f5317f4407979868a8077e	t	2026-09-23 09:44:49.983	2026-09-23 09:44:49.983
cmudx2mgz00036weq6oppua77	media/uploads/products/66ca06c0-f47a-45af-ad02-ce0e027a05ff.jpg	admin-upload:cmu199b0x0000ageqez8earou	ARTICA BEIGE.jpg	image/jpeg	23855672	\N	\N	ARTICA BEIGE	0f5a5da95837baefc24e3a291e1281001a91babb5b3e60d9a7d77bcc18fe0fcd	t	2026-09-23 09:44:50.244	2026-09-23 09:44:50.244
cmudx2n9y00046weqfd0idek3	media/uploads/products/0f2f594d-5a24-487a-ba3a-fcad73a77304.jpg	admin-upload:cmu199b0x0000ageqez8earou	AUSTIN_WHITE.jpg	image/jpeg	47994495	\N	\N	AUSTIN_WHITE	0f68c6ce4f4d4f2160f95b4eb7148dd86cddba68eac946c2281ee58da069981b	t	2026-09-23 09:44:51.286	2026-09-23 09:44:51.286
cmudx429200066weqk97yp7n9	media/uploads/products/b71e1d00-0845-459c-8d0a-7c07877bbc37.jpg	admin-upload:cmu199b0x0000ageqez8earou	ARTICA SILVER+GRAPHITE.jpg	image/jpeg	14363011	\N	\N	ARTICA SILVER+GRAPHITE	f1f7623382e8c3393a52ef0d6c8964274008fbf33c13af1835d06dff1b7c1fa6	t	2026-09-23 09:45:57.35	2026-09-23 09:45:57.35
cmuf4k84700027geqxwcqk4h7	media/uploads/site/c3eff540-5479-4d23-92c3-2b2869624438.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	COTTO RED PREVIEW (1).jpg	image/jpeg	11785562	4000	3077	Silver-grey tiled living room with low round tables and dark timber cabinetry	6f8e0a5bc42d138b55745ebd9d5b049e1c34962938cca49a7139be59c3234d99	t	2026-09-24 06:02:14.935	2026-09-24 06:02:14.935
cmuf4kgeq00037geqdvl6y8ri	media/uploads/site/48add1ad-ef9e-47d2-a6f6-418c7c4fa620.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	COTTO RED PREVIEW (1).jpg	image/jpeg	11785562	4000	3077	Silver-grey tiled living room with low round tables and dark timber cabinetry	6f8e0a5bc42d138b55745ebd9d5b049e1c34962938cca49a7139be59c3234d99	t	2026-09-24 06:02:25.682	2026-09-24 06:02:25.682
cmuf4lb8h00047geq1cfocogx	media/uploads/site/8acf2021-40a0-4134-a2b6-ab3b81e82923.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	ARTICA SILVER+GRAPHITE.jpg	image/jpeg	14363011	4800	3354	Pale textured dining space with woven pendants and palm shadows	f1f7623382e8c3393a52ef0d6c8964274008fbf33c13af1835d06dff1b7c1fa6	t	2026-09-24 06:03:05.633	2026-09-24 06:03:05.633
cmuf4letq00057geqcxmdlynb	media/uploads/site/9252401c-826a-43d8-91ee-082bc9f03ecc.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	EVEREST GREY.jpg	image/jpeg	14105307	5654	4000	Horizontal beige stone-like bands and textured tile detail above a washbasin	cb498a705dcf9853251a1411d5fe468d83f2799207beabf41f851f5e16a7f4a1	t	2026-09-24 06:03:10.286	2026-09-24 06:03:10.286
cmuf4lm3s00067geqth1u3rs6	media/uploads/site/2d9e0314-7857-417f-aea6-f9210e17cc6a.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	AQUA STONE TAUPE.jpg	image/jpeg	12628671	4800	3300	Ochre tiled cafe with a textured feature wall and timber chairs	b04d62e2c2faf71fbc74f802110ff58513c485154b21504a314252607c6af6d1	t	2026-09-24 06:03:19.72	2026-09-24 06:03:19.72
cmuf4lxvl00077geqgb7k9npe	media/uploads/site/77c1d8f9-65d8-4899-ae49-240682f3881f.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	PECAN WHITE.jpg	image/jpeg	13552131	4000	4000	Grey floor tile detail beside a sofa and circular coffee table	5a0fcf8dba932191eac8893923a0615ff3db4c1f7c8ac720c2d121bb64ec829d	t	2026-09-24 06:03:34.977	2026-09-24 06:03:34.977
cmuf4mjky00087geqaakhqaru	media/uploads/site/da252fd7-2537-4323-bd3f-69a23409a71c.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	08 HARAMAIN.jpg	image/jpeg	24286218	6000	3998	Dark tiled reception space with a relief-pattern wall and teal seating	06712439d3e0cadb0c4b90242aadf0037d92ecf8a3fd7d3c1e3b95c641a068de	t	2026-09-24 06:04:03.106	2026-09-24 06:04:03.106
cmuf4mpml00097geqr1rfl1or	media/uploads/site/f7b36946-57d2-483d-b2f7-c2ad73e3e2de.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	6304  .jpg	image/jpeg	19899419	5600	4200	Silver-grey tiled living room with low round tables and dark timber cabinetry	6cb0a96086a321b84c28619128256a322bdf1f62b395f8671e15cc66f871bf4a	t	2026-09-24 06:04:10.941	2026-09-24 06:04:10.941
cmuf4mtwc000a7geqaw43re9r	media/uploads/site/27de10d5-ba1f-46ee-a19b-715228d0f7ac.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	AMAZON CHERRY .jpg	image/jpeg	24872942	5660	4000	Pale textured dining space with woven pendants and palm shadows	74879875a8b6f287359402cabe202866ffd20beeb2663a8f0ff2bb70620260cd	t	2026-09-24 06:04:16.476	2026-09-24 06:04:16.476
cmuf4myoh000b7geq5pys2n17	media/uploads/site/2bd71476-e5dd-437a-a175-6ddfa9dd4ea1.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	ASPEN MINT.jpg	image/jpeg	21846450	5655	4000	Horizontal beige stone-like bands and textured tile detail above a washbasin	437e7193a22b34b41e1e1a9ec2b5ee08d92c41ae482abcc61de248b0b9240053	t	2026-09-24 06:04:22.673	2026-09-24 06:04:22.673
cmuf4n2i4000c7geqzklq04kx	media/uploads/site/9bdd0fa6-cd51-46bb-a9c2-336b7fd1c432.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	1502 .jpg	image/jpeg	18895817	4391	4500	Ochre tiled cafe with a textured feature wall and timber chairs	bd4e186f0101f61d2c778aee77486e300c957f231e13bdb351d280d8056dfa99	t	2026-09-24 06:04:27.628	2026-09-24 06:04:27.628
cmuf4n6nf000d7geqfxz0qia9	media/uploads/site/2e617f83-3d9b-4d8d-b4d8-1e2d4b5e836c.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	01 HARAMAIN.jpg	image/jpeg	7271978	3600	3223	Grey floor tile detail beside a sofa and circular coffee table	bdacd6caca646425c068e5c69c42d77990e0e4b866ae2bee902b511f825a3eb5	t	2026-09-24 06:04:33.003	2026-09-24 06:04:33.003
cmuf4nb5h000e7geqoosho1d3	media/uploads/site/2031f84b-f1d7-4258-ba72-166366179035.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	PECAN TORTORA.jpg	image/jpeg	9168953	3728	3000	Horizontal beige stone-like bands and textured tile detail above a washbasin	b653c89730e2cfddaec84061b2533943258755743d418ba358de385269848ad3	t	2026-09-24 06:04:38.837	2026-09-24 06:04:38.837
cmuf4nf83000f7geq9jctknfh	media/uploads/site/49c6acfe-cd87-43e7-8dc7-2f177a3d8f58.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	4604.jpg	image/jpeg	12597326	4500	3600	Dark tiled reception space with a relief-pattern wall and teal seating	c7e803f2351c1517473a6a9f1bacf1c8f574374cecff2403e0dad34c58e2188a	t	2026-09-24 06:04:44.115	2026-09-24 06:04:44.115
cmuf4nj20000g7geqp209vit2	media/uploads/site/29fb3523-cb3b-4e98-941e-f38ed4229500.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	ASPEN DOVE.jpg	image/jpeg	9624359	4000	2828	Grey floor tile detail beside a sofa and circular coffee table	2d6e18ce9c7493bac51e8e8956c9f5f7fc571011319c6b91f86e9e61ece3234a	t	2026-09-24 06:04:49.08	2026-09-24 06:04:49.08
cmuf4nowm000h7geqxkcwl5a7	media/uploads/site/a45dc21b-63ae-488c-8b26-767f931cc4e4.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	1503.jpg	image/jpeg	10352041	2901	4104	Horizontal beige stone-like bands and textured tile detail above a washbasin	bc2ec337f387e1debdc4142fdc791a512a17bba0e3c0cada87f6b5f1363488a9	t	2026-09-24 06:04:56.662	2026-09-24 06:04:56.662
cmuf4ntl2000i7geqswfnuofm	media/uploads/site/bbd18cfb-c83b-4d07-9b92-408f6ea2dbd4.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	5602.jpg	image/jpeg	15044927	5333	3600	Grey floor tile detail beside a sofa and circular coffee table	31e25bd35ac5787874cd645790f4bc5475add3b362142ca71bb301e700877caa	t	2026-09-24 06:05:02.726	2026-09-24 06:05:02.726
cmuf4nwph000j7geq30rkqmdb	media/uploads/site/2b4bc9c1-8661-4d6a-a93c-5859589d67eb.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	4605 .jpg	image/jpeg	13049191	3543	4724	Ochre tiled cafe with a textured feature wall and timber chairs	d90b811819cf1fa061955c80a8d9ab1dfa0b584d06b7b2b0adc5148225d71b39	t	2026-09-24 06:05:06.773	2026-09-24 06:05:06.773
cmuf4o1kx000k7geqv6golfn0	media/uploads/site/f74eef76-6c65-482d-b059-2d035639fc36.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	020 HARAMAIN.jpg	image/jpeg	9704855	4000	4000	Blue bathroom with a colourful floral tile panel and timber vanity	64da8fce93f07232490d254cb93bfb3f6caad0c7a271e19c25b242826ccf19ac	t	2026-09-24 06:05:13.089	2026-09-24 06:05:13.089
cmuf4o5mm000l7geq7ztjarzw	media/uploads/site/b4a2daa0-a666-4929-a738-68aa20ec2028.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	CANAL AMAZON NUT.jpg	image/jpeg	23563783	5997	4000	Dark tiled reception space with a relief-pattern wall and teal seating	16f5dc0aede9f4ec62f33fa44dc741b5c0f3446227ae525584f88d8f41f64994	t	2026-09-24 06:05:18.334	2026-09-24 06:05:18.334
cmuf4o96c000m7geqvaihw0kh	media/uploads/site/f15b339d-34c7-490d-bb46-2522e9bbe5db.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	18001_FINAL.jpg	image/jpeg	6390422	4000	2224	Pale textured dining space with woven pendants and palm shadows	aed18cae8b44c80378a231d4516ebd19d9915c05d817809303dd31c469408871	t	2026-09-24 06:05:22.932	2026-09-24 06:05:22.932
cmuf4oebq000n7geqxmhfzhrv	media/uploads/site/88106396-e273-4923-a4ef-7653bf922b7e.jpg	admin-site-upload:meet-icon:cmu199b0x0000ageqez8earou	PECAN COFFEE .jpg	image/jpeg	24939366	6744	4104	Ochre tiled cafe with a textured feature wall and timber chairs	420020a34de07a09b5aa708cfe2d5fad8985c76d6f66f1e59e991daa6ee59524	t	2026-09-24 06:05:29.606	2026-09-24 06:05:29.606
cmuflxqkw00co60eqeuyf7wum	media/uploads/site/e59eb2ff-02e0-47a8-a2b2-6992cc2cc3ce.jpg	admin-site-upload:home:cmu199b0x0000ageqez8earou	6602-K17472-2Edit Face-6 MASTER (18).jpg	image/jpeg	5041706	5760	1018	Fenix Haya ceramic surface	7b1866426bdfabd516bbb877680ab67ffa0818f66e9bbbe8853c2eb3a7994b5b	t	2026-09-24 14:08:38.864	2026-09-24 14:08:38.864
cmuflyiz400cr60eq917151jx	media/uploads/site/64190328-0e77-47f0-9f7d-747c75b627d1.jpg	admin-site-upload:home:cmu199b0x0000ageqez8earou	STAR_MOCHA.jpg	image/jpeg	18868300	6000	4000	Sunlit beige tiled living space with timber chairs and an open garden doorway	105c8bacbda8dc12183578e75f7a7164b32bf3838f433bc9c034cbfe9bf453ea	t	2026-09-24 14:09:15.664	2026-09-24 14:09:15.664
cmuflypxn00cs60eqjchgx0n7	media/uploads/site/3ac031cd-86d8-49de-a7e0-a931cd5d549e.jpg	admin-site-upload:home:cmu199b0x0000ageqez8earou	EVEREST TAUPE FINAL.jpg	image/jpeg	13867122	6000	4000	Grey floor tile detail beside a sofa and circular coffee table	791118006076b2cdd6a01e7b7275f9a4e995df3b41fba106e9f99de040953efc	t	2026-09-24 14:09:24.683	2026-09-24 14:09:24.683
cmuflzcry00cv60eq2elle2n3	media/uploads/site/5837499f-1da4-48ea-b321-e0134dbee1dc.jpg	admin-site-upload:home:cmu199b0x0000ageqez8earou	AUSTIN_WHITE.jpg	image/jpeg	47994495	8000	5332	Horizontal beige stone-like bands and textured tile detail above a washbasin	0f68c6ce4f4d4f2160f95b4eb7148dd86cddba68eac946c2281ee58da069981b	t	2026-09-24 14:09:54.286	2026-09-24 14:09:54.286
cmufo20pb00cy60eqolwfhpte	media/uploads/site/0a257754-78f2-4fb5-932a-dadba02549fd.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	AUSTIN_SILVER.jpg	image/jpeg	18367116	7500	4165	AUSTIN_SILVER	b3ee65d31d7db686c1d3e0f83dde7c8ba0ac8d8b57d6978e728355f1d5232ed7	t	2026-09-24 15:07:57.839	2026-09-24 15:07:57.839
cmufo2l7p00cz60eqi7xpz9so	media/uploads/site/d07da8ce-92ab-4655-9ebb-38d11881f97b.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	Avenue grey.jpg	image/jpeg	8061949	4200	2801	test	b370acdc034a253d244d151ad514d62fb0e5b7999c2dec83935487ff9730e02f	t	2026-09-24 15:08:24.421	2026-09-24 15:08:24.421
cmufo2lba00d060eq465eors5	media/uploads/site/f6126fdb-c8df-4fc1-b8ab-329e83dfbaa6.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	COTTO GOLD PREVIEW.jpg	image/jpeg	7148697	3500	2500	test	b45ec000a6cc80e22b3b17c172c90db9272dcd254f4cd09e8fa4d90cb55ec23a	t	2026-09-24 15:08:24.55	2026-09-24 15:08:24.55
cmufo2lg500d160eq1dtdx0ow	media/uploads/site/07ea107f-4d83-4d35-af4f-e9ab2896ccd1.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	COTTO OLIVE PREVIEW.jpg	image/jpeg	9441324	4000	4000	test	7702bc0a0f12b36343f94e8ff4a45f0613b0b0d123733664931d4663b8d67070	t	2026-09-24 15:08:24.725	2026-09-24 15:08:24.725
cmufo2lsf00d260eqlx29wcxd	media/uploads/site/c9995ebb-2096-418b-a213-71e33426669f.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	COTTO RED + AURUM TACO.jpg	image/jpeg	22044303	5669	3779	test	efb33b95d60c50ad8e70be7768bd8e504d59cb9ea3f5317f4407979868a8077e	t	2026-09-24 15:08:25.167	2026-09-24 15:08:25.167
cmufo5nem00dm60eqv0rnot2v	media/uploads/site/3fafb32f-0efd-44bf-ab65-8009e75fadfa.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	ARTICA SILVER+GRAPHITE.jpg	image/jpeg	14363011	4800	3354	ARTICA SILVER+GRAPHITE	f1f7623382e8c3393a52ef0d6c8964274008fbf33c13af1835d06dff1b7c1fa6	t	2026-09-24 15:10:47.23	2026-09-24 15:10:47.23
cmufo66l600dn60eq62035i3n	media/uploads/site/dc308b47-1440-4cdb-8532-be0698d61ca1.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	EVEREST TAUPE FINAL.jpg	image/jpeg	13867122	6000	4000	xyz	791118006076b2cdd6a01e7b7275f9a4e995df3b41fba106e9f99de040953efc	t	2026-09-24 15:11:12.09	2026-09-24 15:11:12.09
cmufo674i00do60eqosdxioww	media/uploads/site/14e84500-aab0-4dea-ba46-f82250afb6df.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	FENIX CREMA.jpg	image/jpeg	13935899	5000	3750	xyz	dd233bd606b578d842c608f9a1c9a7792ac7ed6efc64dbd4f7bd62d64cff9e9c	t	2026-09-24 15:11:12.786	2026-09-24 15:11:12.786
cmufo67an00dp60eql3pqiiuy	media/uploads/site/06f9cb30-f3ab-47f8-b384-e38b3097e2f9.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	FENIX_TAUPE.jpg	image/jpeg	13161297	6000	3750	xyz	4ba0b9f11a402064829569ef2d194caf9f1ed9b0ebcd3330a2ce5c5f555f802f	t	2026-09-24 15:11:13.007	2026-09-24 15:11:13.007
cmufo67hc00dq60eq4bk66tz6	media/uploads/site/0881956e-372c-4b7d-b03d-ccc9ad49254c.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	FOREST GREEN+YELLOW+HERITAGE SQUARE BASE.jpg	image/jpeg	12438033	4005	3120	xyz	285fba10f678bfc7c02bc2a886678804ca2019202afc13f0d38d85872c7b07f8	t	2026-09-24 15:11:13.248	2026-09-24 15:11:13.248
cmufo6cc600dy60eqhk3vga9t	media/uploads/site/c1a44572-26b7-4a45-94c4-074d9cb01dc3.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	STARS_BIANCO.jpg	image/jpeg	16738417	6000	4000	STARS_BIANCO	560896f3ddae6232ddc692c12a34ccb3f3a5a1850660141a3024d1d41990fd0c	t	2026-09-24 15:11:19.542	2026-09-24 15:11:19.542
cmufo6p0c00dz60eqknshi3xn	media/uploads/site/68dcde02-825e-439b-8f44-2af7e8ed1c78.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	PLUTONIC TEAL GRANDE +AQUA STONE SILVER.jpg	image/jpeg	20350227	5333	4000	adsf s	277879a2c29eb80a9cc0c8e2a70dd4389aa6dd9c3b0b8cb5315b55519cf3945d	t	2026-09-24 15:11:35.964	2026-09-24 15:11:35.964
cmufo6peq00e060eqc2dw8z43	media/uploads/site/858c4bbf-e04c-41d1-8e92-1ffa374ca788.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	POLAR CHARCOAL.jpg	image/jpeg	23257168	5713	4000	adsf s	b9bc9f4554a51d12c980da674ffeffabeb9f143bca40120f483218b06dc369e1	t	2026-09-24 15:11:36.482	2026-09-24 15:11:36.482
cmufo6pm600e160eqmo50oe0o	media/uploads/site/6d086a49-c098-424f-be60-37a14f2af5f1.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	STAR_GREY.jpg	image/jpeg	15928373	6000	4000	adsf s	7b4227afbf40f6933ba54ec0c2ab9bc67c47c64216eae783b84030b946c51e4f	t	2026-09-24 15:11:36.75	2026-09-24 15:11:36.75
cmufo6puy00e260eqgdji9ayw	media/uploads/site/48a59ac5-0bde-4511-8be4-84c84d70f9d0.jpg	admin-site-upload:projects:cmu199b0x0000ageqez8earou	STAR_MOCHA.jpg	image/jpeg	18868300	6000	4000	adsf s	105c8bacbda8dc12183578e75f7a7164b32bf3838f433bc9c034cbfe9bf453ea	t	2026-09-24 15:11:37.066	2026-09-24 15:11:37.066
cmuggipab0001b4eqysc130m2	media/uploads/catalogues/8a753df5-9a0d-4c8c-8a88-2d3da440420e.jpg	admin-catalogue-upload:cover:cmu199b0x0000ageqez8earou	1502 .jpg	image/jpeg	18895817	4391	4500	test catalogue cover	bd4e186f0101f61d2c778aee77486e300c957f231e13bdb351d280d8056dfa99	t	2026-09-25 04:24:45.443	2026-09-25 04:24:45.443
cmuggiypd0002b4eqw478ulih	media/uploads/catalogues/59007f28-b60f-4aa9-ae87-a0c2048cc827.pdf	admin-catalogue-upload:pdf:cmu199b0x0000ageqez8earou	Icon website Timeline.pdf	application/pdf	2095268	\N	\N	Icon website Timeline.pdf	c18c1a387d400abc8ebe939a48412e3a07724970c9877105accf53ae83a9ccdc	t	2026-09-25 04:24:57.649	2026-09-25 04:24:57.649
\.


--
-- TOC entry 5191 (class 0 OID 67526)
-- Dependencies: 222
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Permission" (id, key) FROM stdin;
cmu1995a10000woeq0phd3elr	dashboard:read
\.


--
-- TOC entry 5196 (class 0 OID 67590)
-- Dependencies: 227
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Product" (id, slug, name, code, description, state, "sortOrder", "publishedAt", "seoId", "createdAt", "updatedAt", "homepageHeroEligible", "isFeatured", "previewMediaId", "primaryTextureId") FROM stdin;
cmudx4o6700076weqgbdaerd5	aaaa	Test	356	dkjfnms dofigsnjm	PUBLISHED	1	2026-09-23 09:46:25.757	\N	2026-09-23 09:46:25.759	2026-09-23 14:21:42.494	t	t	cmudx429200066weqk97yp7n9	\N
cmucbekvp0001vkeq2hwd36qe	test	Test	333	this is a test product	PUBLISHED	1	2026-09-22 06:50:30.318	cmucbekxj0003vkeq8tw9prow	2026-09-22 06:50:30.326	2026-09-24 13:36:01.284	f	t	cmu9zxqgp000264eqefukdzhh	cmucc0p4e0006vkeqzq4wl9yh
\.


--
-- TOC entry 5201 (class 0 OID 67675)
-- Dependencies: 232
-- Data for Name: ProductAttribute; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductAttribute" ("productId", "valueId") FROM stdin;
cmucbekvp0001vkeq2hwd36qe	cmufk0xoe000260eqndy1iyrk
cmucbekvp0001vkeq2hwd36qe	cmufk0xq5000d60eqvyaox744
cmucbekvp0001vkeq2hwd36qe	cmufk0xrr000i60eqm17q66xb
cmucbekvp0001vkeq2hwd36qe	cmufk0xve000v60eqsj16j7if
\.


--
-- TOC entry 5198 (class 0 OID 67636)
-- Dependencies: 229
-- Data for Name: ProductCollection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductCollection" ("productId", "collectionId", "sortOrder") FROM stdin;
cmucbekvp0001vkeq2hwd36qe	cmu9y8vuf000164eqpr8swzbe	0
\.


--
-- TOC entry 5204 (class 0 OID 67717)
-- Dependencies: 235
-- Data for Name: ProductImage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductImage" (id, "productId", "mediaId", role, "sortOrder") FROM stdin;
cmue6yokq0007eoeq3fui7tec	cmudx4o6700076weqgbdaerd5	cmudx2mgz00036weq6oppua77	gallery	0
cmue6yokq0008eoeqysaeceqn	cmudx4o6700076weqgbdaerd5	cmudx2n9y00046weqfd0idek3	gallery	1
cmue6yokq0009eoeqd0enmdwj	cmudx4o6700076weqgbdaerd5	cmudx2m9r00026weq1syw4oot	gallery	2
cmue6yokq000aeoeqvg4h9iup	cmudx4o6700076weqgbdaerd5	cmudx29yd00006weqjrdvluwr	gallery	3
cmue6yokq000beoeqffbo3673	cmudx4o6700076weqgbdaerd5	cmucc0sb40007vkeqizzx8z5f	gallery	4
cmufkrs4n00cl60eqdd5png1j	cmucbekvp0001vkeq2hwd36qe	cmucbzex50005vkequl64tc7h	gallery	0
cmufkrs4n00cm60eq02x4dje5	cmucbekvp0001vkeq2hwd36qe	cmucc0p4e0006vkeqzq4wl9yh	gallery	1
cmufkrs4n00cn60eqyzrzighm	cmucbekvp0001vkeq2hwd36qe	cmucc0sb40007vkeqizzx8z5f	gallery	2
\.


--
-- TOC entry 5203 (class 0 OID 67695)
-- Dependencies: 234
-- Data for Name: ProductVariant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProductVariant" (id, "productId", "sizeId", sku, "variantKey", "thicknessMm", "sortOrder") FROM stdin;
cmue6yokm0006eoeqe07x5ee8	cmudx4o6700076weqgbdaerd5	cmue2rkaz00015oeq800mapdt	\N	cmue2rkaz00015oeq800mapdt	\N	0
\.


--
-- TOC entry 5208 (class 0 OID 67853)
-- Dependencies: 239
-- Data for Name: Project; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Project" (id, slug, title, introduction, architect, location, state, "sortOrder", "publishedAt", "categoryId", "applicationId", "seoId", "createdAt", "updatedAt") FROM stdin;
cmufo67zg00ds60eqynrdx1lz	xyzz	xyz	sjuodibvs sduiobfgsd soidn f	\N	aiosdfh	PUBLISHED	1	2026-09-24 15:11:13.897	cmufo67zb00dr60eqb50ckjdy	\N	\N	2026-09-24 15:11:13.901	2026-09-24 15:11:13.901
cmufo6qmt00e460eqvnh1w4xo	sdf-d	adsf s	gsdgfasoei fsiouahn dfha9oisdh f	\N	dfszg	PUBLISHED	2	2026-09-24 15:11:38.066	cmufo6qmp00e360eqi057y34s	\N	\N	2026-09-24 15:11:38.069	2026-09-24 15:11:38.069
cmufo2mxm00d460eqh4bmrbq9	abcd	test	ajsiklhdfa ndoscvns;;;	\N	kitchen	PUBLISHED	0	2026-09-24 15:12:04.691	cmufo2mx800d360eqgz6440k1	\N	\N	2026-09-24 15:08:26.65	2026-09-24 15:12:04.691
\.


--
-- TOC entry 5207 (class 0 OID 67843)
-- Dependencies: 238
-- Data for Name: ProjectCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProjectCategory" (id, name, slug) FROM stdin;
cmufo67zb00dr60eqb50ckjdy	sleep	sleep
cmufo6qmp00e360eqi057y34s	dfg z	dfg-z
cmufo2mx800d360eqgz6440k1	Bathing spaces	bathing-spaces
\.


--
-- TOC entry 5209 (class 0 OID 67870)
-- Dependencies: 240
-- Data for Name: ProjectImage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ProjectImage" (id, "projectId", "mediaId", "sortOrder") FROM stdin;
cmufo67zl00dt60eqwy5oemtw	cmufo67zg00ds60eqynrdx1lz	cmufo5nem00dm60eqv0rnot2v	0
cmufo67zl00du60eqj5tin28t	cmufo67zg00ds60eqynrdx1lz	cmufo66l600dn60eq62035i3n	1
cmufo67zl00dv60eqq3tugcbw	cmufo67zg00ds60eqynrdx1lz	cmufo674i00do60eqosdxioww	2
cmufo67zl00dw60eqaobge687	cmufo67zg00ds60eqynrdx1lz	cmufo67an00dp60eql3pqiiuy	3
cmufo67zl00dx60eqo70ihj9p	cmufo67zg00ds60eqynrdx1lz	cmufo67hc00dq60eq4bk66tz6	4
cmufo6qmw00e560eqttdi24qa	cmufo6qmt00e460eqvnh1w4xo	cmufo6cc600dy60eqhk3vga9t	0
cmufo6qmw00e660eqdudthl9z	cmufo6qmt00e460eqvnh1w4xo	cmufo6p0c00dz60eqknshi3xn	1
cmufo6qmw00e760eqlrrpnwac	cmufo6qmt00e460eqvnh1w4xo	cmufo6peq00e060eqc2dw8z43	2
cmufo6qmw00e860eqqlpqltab	cmufo6qmt00e460eqvnh1w4xo	cmufo6pm600e160eqmo50oe0o	3
cmufo6qmw00e960eqvlwfs87z	cmufo6qmt00e460eqvnh1w4xo	cmufo6puy00e260eqgdji9ayw	4
cmufo7b6j00eb60eqf48thbfj	cmufo2mxm00d460eqh4bmrbq9	cmufo20pb00cy60eqolwfhpte	0
cmufo7b6j00ec60eqhwbckm54	cmufo2mxm00d460eqh4bmrbq9	cmufo2l7p00cz60eqi7xpz9so	1
cmufo7b6j00ed60eqs3diav90	cmufo2mxm00d460eqh4bmrbq9	cmufo2lba00d060eq465eors5	2
cmufo7b6j00ee60eq3wv440yq	cmufo2mxm00d460eqh4bmrbq9	cmufo2lg500d160eq1dtdx0ow	3
cmufo7b6j00ef60eq9ifeivp0	cmufo2mxm00d460eqh4bmrbq9	cmufo2lsf00d260eqlx29wcxd	4
\.


--
-- TOC entry 5190 (class 0 OID 67517)
-- Dependencies: 221
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name) FROM stdin;
role_super_admin	SUPER_ADMIN
role_admin	ADMIN
\.


--
-- TOC entry 5192 (class 0 OID 67535)
-- Dependencies: 223
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RolePermission" ("roleId", "permissionId") FROM stdin;
role_super_admin	cmu1995a10000woeq0phd3elr
role_admin	cmu1995a10000woeq0phd3elr
\.


--
-- TOC entry 5213 (class 0 OID 67964)
-- Dependencies: 244
-- Data for Name: SeoMetadata; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SeoMetadata" (id, title, description, "canonicalPath", "socialImageKey", "noIndex") FROM stdin;
cmucbekxj0003vkeq8tw9prow	test	test product for your house	\N	assets/home/product-showcase/cotto-gold.webp	f
\.


--
-- TOC entry 5212 (class 0 OID 67949)
-- Dependencies: 243
-- Data for Name: SiteContent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SiteContent" (id, "sectionId", locale, payload, version, "updatedAt") FROM stdin;
cmuf4og1b000p7geqzdqc2pul	cmuf4og15000o7geqbtvpbxl7	en	{"heroMediaId": "", "finalCtaMediaId": "cmuf4oebq000n7geqxmhfzhrv", "journeyMediaIds": ["cmuf4kgeq00037geqdvl6y8ri", "cmuf4lb8h00047geq1cfocogx", "cmuf4letq00057geqcxmdlynb", "cmuf4lm3s00067geqth1u3rs6", "cmuf4lxvl00077geqgb7k9npe", "cmuf4mjky00087geqaakhqaru", "cmuf4mpml00097geqr1rfl1or", "cmuf4mtwc000a7geqaw43re9r", "cmuf4myoh000b7geq5pys2n17", "cmuf4n2i4000c7geqzklq04kx", "cmuf4n6nf000d7geqfxz0qia9"], "technologyMediaIds": ["cmuf4nowm000h7geqxkcwl5a7", "cmuf4ntl2000i7geqswfnuofm", "cmuf4nwph000j7geq30rkqmdb", "cmuf4o1kx000k7geqv6golfn0", "cmuf4o5mm000l7geq7ztjarzw", "cmuf4o96c000m7geqvaihw0kh"], "manufacturingMediaIds": ["cmuf4nb5h000e7geqoosho1d3", "cmuf4nf83000f7geq9jctknfh", "cmuf4nj20000g7geqp209vit2"]}	1	2026-09-24 06:05:31.823
cmuflxtit00cq60eqs17qzp4m	cmuflxtim00cp60eqzg5qv2zi	en	{"surfaceMediaIds": ["", "", "", "", "", "cmuflypxn00cs60eqjchgx0n7", "", ""], "heroTileMediaIds": ["cmuflxqkw00co60eqeuyf7wum", "", "", "", "", "", "", "", "", "", "", ""], "houseMainMediaId": "cmuflyiz400cr60eq917151jx", "houseDetailMediaId": "cmuflzcry00cv60eq2elle2n3"}	3	2026-09-24 14:09:55.018
cmufo83zl00eh60eqt25afkid	cmufo83zi00eg60eqklkyzeaz	en	{"heroMediaId": "", "categoryMedia": [{"mediaId": "", "categorySlug": "bathing-spaces"}, {"mediaId": "", "categorySlug": "dfg-z"}, {"mediaId": "", "categorySlug": "sleep"}], "galleryMediaIds": ["", "", "", "", ""], "sequenceMediaIds": ["", "", ""], "featuredProjectId": "cmufo6qmt00e460eqvnh1w4xo", "featuredPrimaryMediaId": "", "featuredSecondaryMediaId": ""}	1	2026-09-24 15:12:42.033
\.


--
-- TOC entry 5211 (class 0 OID 67935)
-- Dependencies: 242
-- Data for Name: SiteSection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SiteSection" (id, page, key, "sortOrder", state) FROM stdin;
cmuf4og15000o7geqbtvpbxl7	meet-icon	media	0	PUBLISHED
cmuflxtim00cp60eqzg5qv2zi	home	media	0	PUBLISHED
cmufo83zi00eg60eqklkyzeaz	projects	media	0	PUBLISHED
\.


--
-- TOC entry 5202 (class 0 OID 67684)
-- Dependencies: 233
-- Data for Name: Size; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Size" (id, label, "widthMm", "lengthMm") FROM stdin;
cmue2rkaz00015oeq800mapdt	600x1200	10.00	5.00
\.


--
-- TOC entry 5188 (class 0 OID 67441)
-- Dependencies: 219
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
5cefdf44-2ec9-46d1-955e-e182b67c9512	0a184d160b3eb2f570d8e5ed8843054d0803dc770a5f9eead1683397443ec1b3	2026-09-14 18:34:36.447578+05:30	20260909000000_postgresql_foundation	\N	\N	2026-09-14 18:34:36.431125+05:30	1
b9a5ec75-9890-446e-ab1e-b2e0f1ebc301	2b166de671c79ebb6f91d8edf7bc52cda4cc88757216f7facaf0af5b86953bda	2026-09-14 18:34:36.776867+05:30	202609110001_foundation	\N	\N	2026-09-14 18:34:36.449476+05:30	1
96417bae-f27c-4bed-9606-da72827fad02	da613631eb9ddf29058e27593a5de638321f44d022e0701cf14a1cce3a4830aa	2026-09-14 18:34:36.801244+05:30	20260912120809_homepage_material_journey	\N	\N	2026-09-14 18:34:36.777383+05:30	1
4751f3c6-d493-4e2c-8563-4baa16ef78cc	906ccc43b83978eda29e90dc64b7c9af8e7d6a08cdbc6273b96b0f8edbb628d3	2026-09-14 18:34:36.808734+05:30	202609140001_admin_auth_foundation	\N	\N	2026-09-14 18:34:36.802158+05:30	1
fe2d562c-8e2f-4208-b377-fba874b421db	e0d523f7bab8d66bea53c135c2a447a7fe8154db0b87740b8f244d9d0714880e	2026-09-23 09:16:08.273894+05:30	202609220001_product_technical_content	\N	\N	2026-09-23 09:16:07.893944+05:30	1
4a499bcd-52bf-404a-8f38-faa80efd15b9	e70fde796eceadd82543a3ffdad12bf7284a06bf95adfab8012ae4c58bc3b946	2026-09-23 09:27:16.551695+05:30	202609230001_product_application_description	\N	\N	2026-09-23 09:27:16.521257+05:30	1
de60ea49-a266-49a5-bb96-d38969009a97	fa6f1e143c6aacae14d2eadea1ec72b562912b26723b55a848b81215e239f351	2026-09-25 11:19:41.236218+05:30	202609250001_database_cleanup	\N	\N	2026-09-25 11:19:41.11477+05:30	1
\.


--
-- TOC entry 4924 (class 2606 OID 67560)
-- Name: AdminSession AdminSession_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminSession"
    ADD CONSTRAINT "AdminSession_pkey" PRIMARY KEY (id);


--
-- TOC entry 4910 (class 2606 OID 67479)
-- Name: AdminUser AdminUser_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminUser"
    ADD CONSTRAINT "AdminUser_pkey" PRIMARY KEY (id);


--
-- TOC entry 4978 (class 2606 OID 67781)
-- Name: Application Application_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Application"
    ADD CONSTRAINT "Application_pkey" PRIMARY KEY (id);


--
-- TOC entry 4955 (class 2606 OID 67661)
-- Name: AttributeDefinition AttributeDefinition_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AttributeDefinition"
    ADD CONSTRAINT "AttributeDefinition_pkey" PRIMARY KEY (id);


--
-- TOC entry 4959 (class 2606 OID 67674)
-- Name: AttributeValue AttributeValue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AttributeValue"
    ADD CONSTRAINT "AttributeValue_pkey" PRIMARY KEY (id);


--
-- TOC entry 4984 (class 2606 OID 67816)
-- Name: Catalogue Catalogue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Catalogue"
    ADD CONSTRAINT "Catalogue_pkey" PRIMARY KEY (id);


--
-- TOC entry 4947 (class 2606 OID 67635)
-- Name: Collection Collection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Collection"
    ADD CONSTRAINT "Collection_pkey" PRIMARY KEY (id);


--
-- TOC entry 5003 (class 2606 OID 67934)
-- Name: Enquiry Enquiry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Enquiry"
    ADD CONSTRAINT "Enquiry_pkey" PRIMARY KEY (id);


--
-- TOC entry 4929 (class 2606 OID 67571)
-- Name: LoginThrottle LoginThrottle_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LoginThrottle"
    ADD CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY (key);


--
-- TOC entry 4931 (class 2606 OID 67589)
-- Name: MediaAsset MediaAsset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MediaAsset"
    ADD CONSTRAINT "MediaAsset_pkey" PRIMARY KEY (id);


--
-- TOC entry 4917 (class 2606 OID 67534)
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- TOC entry 4961 (class 2606 OID 67683)
-- Name: ProductAttribute ProductAttribute_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductAttribute"
    ADD CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("productId", "valueId");


--
-- TOC entry 4953 (class 2606 OID 67646)
-- Name: ProductCollection ProductCollection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductCollection"
    ADD CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("productId", "collectionId");


--
-- TOC entry 4974 (class 2606 OID 67729)
-- Name: ProductImage ProductImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id);


--
-- TOC entry 4968 (class 2606 OID 67707)
-- Name: ProductVariant ProductVariant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_pkey" PRIMARY KEY (id);


--
-- TOC entry 4937 (class 2606 OID 67606)
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- TOC entry 4988 (class 2606 OID 67852)
-- Name: ProjectCategory ProjectCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectCategory"
    ADD CONSTRAINT "ProjectCategory_pkey" PRIMARY KEY (id);


--
-- TOC entry 4999 (class 2606 OID 67881)
-- Name: ProjectImage ProjectImage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectImage"
    ADD CONSTRAINT "ProjectImage_pkey" PRIMARY KEY (id);


--
-- TOC entry 4993 (class 2606 OID 67869)
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- TOC entry 4920 (class 2606 OID 67543)
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId");


--
-- TOC entry 4914 (class 2606 OID 67525)
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- TOC entry 5013 (class 2606 OID 67973)
-- Name: SeoMetadata SeoMetadata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SeoMetadata"
    ADD CONSTRAINT "SeoMetadata_pkey" PRIMARY KEY (id);


--
-- TOC entry 5010 (class 2606 OID 67963)
-- Name: SiteContent SiteContent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteContent"
    ADD CONSTRAINT "SiteContent_pkey" PRIMARY KEY (id);


--
-- TOC entry 5008 (class 2606 OID 67948)
-- Name: SiteSection SiteSection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteSection"
    ADD CONSTRAINT "SiteSection_pkey" PRIMARY KEY (id);


--
-- TOC entry 4965 (class 2606 OID 67694)
-- Name: Size Size_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Size"
    ADD CONSTRAINT "Size_pkey" PRIMARY KEY (id);


--
-- TOC entry 4906 (class 2606 OID 67454)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4921 (class 1259 OID 67979)
-- Name: AdminSession_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminSession_expiresAt_idx" ON public."AdminSession" USING btree ("expiresAt");


--
-- TOC entry 4922 (class 1259 OID 68286)
-- Name: AdminSession_lastUsedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminSession_lastUsedAt_idx" ON public."AdminSession" USING btree ("lastUsedAt");


--
-- TOC entry 4925 (class 1259 OID 67978)
-- Name: AdminSession_tokenHash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AdminSession_tokenHash_key" ON public."AdminSession" USING btree ("tokenHash");


--
-- TOC entry 4926 (class 1259 OID 67980)
-- Name: AdminSession_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminSession_userId_idx" ON public."AdminSession" USING btree ("userId");


--
-- TOC entry 4907 (class 1259 OID 67480)
-- Name: AdminUser_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AdminUser_email_key" ON public."AdminUser" USING btree (email);


--
-- TOC entry 4908 (class 1259 OID 68285)
-- Name: AdminUser_lastLoginAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminUser_lastLoginAt_idx" ON public."AdminUser" USING btree ("lastLoginAt");


--
-- TOC entry 4911 (class 1259 OID 67977)
-- Name: AdminUser_roleId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AdminUser_roleId_idx" ON public."AdminUser" USING btree ("roleId");


--
-- TOC entry 4979 (class 1259 OID 68011)
-- Name: Application_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Application_slug_key" ON public."Application" USING btree (slug);


--
-- TOC entry 4980 (class 1259 OID 68012)
-- Name: Application_state_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Application_state_sortOrder_idx" ON public."Application" USING btree (state, "sortOrder");


--
-- TOC entry 4956 (class 1259 OID 67995)
-- Name: AttributeDefinition_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AttributeDefinition_slug_key" ON public."AttributeDefinition" USING btree (slug);


--
-- TOC entry 4957 (class 1259 OID 67996)
-- Name: AttributeValue_definitionId_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AttributeValue_definitionId_slug_key" ON public."AttributeValue" USING btree ("definitionId", slug);


--
-- TOC entry 4981 (class 1259 OID 68017)
-- Name: Catalogue_coverId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Catalogue_coverId_idx" ON public."Catalogue" USING btree ("coverId");


--
-- TOC entry 4982 (class 1259 OID 68018)
-- Name: Catalogue_pdfId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Catalogue_pdfId_idx" ON public."Catalogue" USING btree ("pdfId");


--
-- TOC entry 4985 (class 1259 OID 68015)
-- Name: Catalogue_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Catalogue_slug_key" ON public."Catalogue" USING btree (slug);


--
-- TOC entry 4986 (class 1259 OID 68016)
-- Name: Catalogue_state_publishedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Catalogue_state_publishedAt_idx" ON public."Catalogue" USING btree (state, "publishedAt");


--
-- TOC entry 4944 (class 1259 OID 68258)
-- Name: Collection_coverMediaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Collection_coverMediaId_idx" ON public."Collection" USING btree ("coverMediaId");


--
-- TOC entry 4945 (class 1259 OID 68259)
-- Name: Collection_heroMediaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Collection_heroMediaId_idx" ON public."Collection" USING btree ("heroMediaId");


--
-- TOC entry 4948 (class 1259 OID 67992)
-- Name: Collection_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Collection_slug_key" ON public."Collection" USING btree (slug);


--
-- TOC entry 4949 (class 1259 OID 68257)
-- Name: Collection_state_isFeatured_homepageOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Collection_state_isFeatured_homepageOrder_idx" ON public."Collection" USING btree (state, "isFeatured", "homepageOrder");


--
-- TOC entry 4950 (class 1259 OID 67993)
-- Name: Collection_state_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Collection_state_sortOrder_idx" ON public."Collection" USING btree (state, "sortOrder");


--
-- TOC entry 5004 (class 1259 OID 68036)
-- Name: Enquiry_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Enquiry_productId_idx" ON public."Enquiry" USING btree ("productId");


--
-- TOC entry 5005 (class 1259 OID 68035)
-- Name: Enquiry_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Enquiry_status_createdAt_idx" ON public."Enquiry" USING btree (status, "createdAt");


--
-- TOC entry 4927 (class 1259 OID 67981)
-- Name: LoginThrottle_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LoginThrottle_expiresAt_idx" ON public."LoginThrottle" USING btree ("expiresAt");


--
-- TOC entry 4932 (class 1259 OID 67983)
-- Name: MediaAsset_sha256_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "MediaAsset_sha256_idx" ON public."MediaAsset" USING btree (sha256);


--
-- TOC entry 4933 (class 1259 OID 67982)
-- Name: MediaAsset_storageKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON public."MediaAsset" USING btree ("storageKey");


--
-- TOC entry 4915 (class 1259 OID 67975)
-- Name: Permission_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Permission_key_key" ON public."Permission" USING btree (key);


--
-- TOC entry 4962 (class 1259 OID 67997)
-- Name: ProductAttribute_valueId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductAttribute_valueId_idx" ON public."ProductAttribute" USING btree ("valueId");


--
-- TOC entry 4951 (class 1259 OID 67994)
-- Name: ProductCollection_collectionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductCollection_collectionId_sortOrder_idx" ON public."ProductCollection" USING btree ("collectionId", "sortOrder");


--
-- TOC entry 4972 (class 1259 OID 68005)
-- Name: ProductImage_mediaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductImage_mediaId_idx" ON public."ProductImage" USING btree ("mediaId");


--
-- TOC entry 4975 (class 1259 OID 68006)
-- Name: ProductImage_productId_mediaId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProductImage_productId_mediaId_key" ON public."ProductImage" USING btree ("productId", "mediaId");


--
-- TOC entry 4976 (class 1259 OID 68004)
-- Name: ProductImage_productId_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductImage_productId_sortOrder_idx" ON public."ProductImage" USING btree ("productId", "sortOrder");


--
-- TOC entry 4969 (class 1259 OID 68002)
-- Name: ProductVariant_productId_variantKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProductVariant_productId_variantKey_key" ON public."ProductVariant" USING btree ("productId", "variantKey");


--
-- TOC entry 4970 (class 1259 OID 68001)
-- Name: ProductVariant_sizeId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProductVariant_sizeId_idx" ON public."ProductVariant" USING btree ("sizeId");


--
-- TOC entry 4971 (class 1259 OID 68000)
-- Name: ProductVariant_sku_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProductVariant_sku_key" ON public."ProductVariant" USING btree (sku);


--
-- TOC entry 4934 (class 1259 OID 67985)
-- Name: Product_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Product_code_key" ON public."Product" USING btree (code);


--
-- TOC entry 4935 (class 1259 OID 67989)
-- Name: Product_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Product_name_idx" ON public."Product" USING btree (name);


--
-- TOC entry 4938 (class 1259 OID 68262)
-- Name: Product_previewMediaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Product_previewMediaId_idx" ON public."Product" USING btree ("previewMediaId");


--
-- TOC entry 4939 (class 1259 OID 68261)
-- Name: Product_primaryTextureId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Product_primaryTextureId_idx" ON public."Product" USING btree ("primaryTextureId");


--
-- TOC entry 4940 (class 1259 OID 67986)
-- Name: Product_seoId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Product_seoId_key" ON public."Product" USING btree ("seoId");


--
-- TOC entry 4941 (class 1259 OID 67984)
-- Name: Product_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Product_slug_key" ON public."Product" USING btree (slug);


--
-- TOC entry 4942 (class 1259 OID 68260)
-- Name: Product_state_homepageHeroEligible_isFeatured_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Product_state_homepageHeroEligible_isFeatured_sortOrder_idx" ON public."Product" USING btree (state, "homepageHeroEligible", "isFeatured", "sortOrder");


--
-- TOC entry 4943 (class 1259 OID 67987)
-- Name: Product_state_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Product_state_sortOrder_idx" ON public."Product" USING btree (state, "sortOrder");


--
-- TOC entry 4989 (class 1259 OID 68023)
-- Name: ProjectCategory_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProjectCategory_slug_key" ON public."ProjectCategory" USING btree (slug);


--
-- TOC entry 4997 (class 1259 OID 68030)
-- Name: ProjectImage_mediaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProjectImage_mediaId_idx" ON public."ProjectImage" USING btree ("mediaId");


--
-- TOC entry 5000 (class 1259 OID 68031)
-- Name: ProjectImage_projectId_mediaId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ProjectImage_projectId_mediaId_key" ON public."ProjectImage" USING btree ("projectId", "mediaId");


--
-- TOC entry 5001 (class 1259 OID 68029)
-- Name: ProjectImage_projectId_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ProjectImage_projectId_sortOrder_idx" ON public."ProjectImage" USING btree ("projectId", "sortOrder");


--
-- TOC entry 4990 (class 1259 OID 68028)
-- Name: Project_applicationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_applicationId_idx" ON public."Project" USING btree ("applicationId");


--
-- TOC entry 4991 (class 1259 OID 68027)
-- Name: Project_categoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_categoryId_idx" ON public."Project" USING btree ("categoryId");


--
-- TOC entry 4994 (class 1259 OID 68025)
-- Name: Project_seoId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Project_seoId_key" ON public."Project" USING btree ("seoId");


--
-- TOC entry 4995 (class 1259 OID 68024)
-- Name: Project_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Project_slug_key" ON public."Project" USING btree (slug);


--
-- TOC entry 4996 (class 1259 OID 68026)
-- Name: Project_state_sortOrder_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Project_state_sortOrder_idx" ON public."Project" USING btree (state, "sortOrder");


--
-- TOC entry 4918 (class 1259 OID 67976)
-- Name: RolePermission_permissionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "RolePermission_permissionId_idx" ON public."RolePermission" USING btree ("permissionId");


--
-- TOC entry 4912 (class 1259 OID 67974)
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- TOC entry 5011 (class 1259 OID 68038)
-- Name: SiteContent_sectionId_locale_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SiteContent_sectionId_locale_key" ON public."SiteContent" USING btree ("sectionId", locale);


--
-- TOC entry 5006 (class 1259 OID 68037)
-- Name: SiteSection_page_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SiteSection_page_key_key" ON public."SiteSection" USING btree (page, key);


--
-- TOC entry 4963 (class 1259 OID 67998)
-- Name: Size_label_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Size_label_key" ON public."Size" USING btree (label);


--
-- TOC entry 4966 (class 1259 OID 67999)
-- Name: Size_widthMm_lengthMm_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Size_widthMm_lengthMm_key" ON public."Size" USING btree ("widthMm", "lengthMm");


--
-- TOC entry 5017 (class 2606 OID 68054)
-- Name: AdminSession AdminSession_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminSession"
    ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."AdminUser"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5014 (class 2606 OID 68049)
-- Name: AdminUser AdminUser_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AdminUser"
    ADD CONSTRAINT "AdminUser_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5025 (class 2606 OID 68084)
-- Name: AttributeValue AttributeValue_definitionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AttributeValue"
    ADD CONSTRAINT "AttributeValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES public."AttributeDefinition"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5032 (class 2606 OID 68169)
-- Name: Catalogue Catalogue_coverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Catalogue"
    ADD CONSTRAINT "Catalogue_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES public."MediaAsset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5033 (class 2606 OID 68174)
-- Name: Catalogue Catalogue_pdfId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Catalogue"
    ADD CONSTRAINT "Catalogue_pdfId_fkey" FOREIGN KEY ("pdfId") REFERENCES public."MediaAsset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5021 (class 2606 OID 68273)
-- Name: Collection Collection_coverMediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Collection"
    ADD CONSTRAINT "Collection_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES public."MediaAsset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5022 (class 2606 OID 68278)
-- Name: Collection Collection_heroMediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Collection"
    ADD CONSTRAINT "Collection_heroMediaId_fkey" FOREIGN KEY ("heroMediaId") REFERENCES public."MediaAsset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5039 (class 2606 OID 68239)
-- Name: Enquiry Enquiry_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Enquiry"
    ADD CONSTRAINT "Enquiry_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5026 (class 2606 OID 68089)
-- Name: ProductAttribute ProductAttribute_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductAttribute"
    ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5027 (class 2606 OID 68094)
-- Name: ProductAttribute ProductAttribute_valueId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductAttribute"
    ADD CONSTRAINT "ProductAttribute_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES public."AttributeValue"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5023 (class 2606 OID 68079)
-- Name: ProductCollection ProductCollection_collectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductCollection"
    ADD CONSTRAINT "ProductCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES public."Collection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5024 (class 2606 OID 68074)
-- Name: ProductCollection ProductCollection_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductCollection"
    ADD CONSTRAINT "ProductCollection_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5030 (class 2606 OID 68124)
-- Name: ProductImage ProductImage_mediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES public."MediaAsset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5031 (class 2606 OID 68119)
-- Name: ProductImage ProductImage_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductImage"
    ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5028 (class 2606 OID 68099)
-- Name: ProductVariant ProductVariant_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5029 (class 2606 OID 68104)
-- Name: ProductVariant ProductVariant_sizeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProductVariant"
    ADD CONSTRAINT "ProductVariant_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES public."Size"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5018 (class 2606 OID 68268)
-- Name: Product Product_previewMediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_previewMediaId_fkey" FOREIGN KEY ("previewMediaId") REFERENCES public."MediaAsset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5019 (class 2606 OID 68263)
-- Name: Product Product_primaryTextureId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_primaryTextureId_fkey" FOREIGN KEY ("primaryTextureId") REFERENCES public."MediaAsset"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5020 (class 2606 OID 68064)
-- Name: Product Product_seoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES public."SeoMetadata"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5037 (class 2606 OID 68214)
-- Name: ProjectImage ProjectImage_mediaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectImage"
    ADD CONSTRAINT "ProjectImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES public."MediaAsset"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 5038 (class 2606 OID 68209)
-- Name: ProjectImage ProjectImage_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ProjectImage"
    ADD CONSTRAINT "ProjectImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5034 (class 2606 OID 68199)
-- Name: Project Project_applicationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES public."Application"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5035 (class 2606 OID 68194)
-- Name: Project Project_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProjectCategory"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5036 (class 2606 OID 68204)
-- Name: Project Project_seoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Project"
    ADD CONSTRAINT "Project_seoId_fkey" FOREIGN KEY ("seoId") REFERENCES public."SeoMetadata"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 5015 (class 2606 OID 68044)
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5016 (class 2606 OID 68039)
-- Name: RolePermission RolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 5040 (class 2606 OID 68244)
-- Name: SiteContent SiteContent_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SiteContent"
    ADD CONSTRAINT "SiteContent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public."SiteSection"(id) ON UPDATE CASCADE ON DELETE CASCADE;


-- Completed on 2026-09-25 13:28:59

--
-- PostgreSQL database dump complete
--

\unrestrict Nf8TL3dWhJtGa5aYyO6V6VI8KQtiVlD5iseZjKKAwYkAnDtjUNRSdQJyqUyxYNb

