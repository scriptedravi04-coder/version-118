import express from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function calculateReadTime(content: string): number {
  if (!content) return 3;
  const cleanText = content.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
  const wordCount = cleanText.split(" ").filter(Boolean).length;
  const readTime = Math.ceil(wordCount / 200);
  return Math.max(1, readTime);
}

export function setupBlogRoutes(
  app: express.Application,
  router: express.Router,
  {
    privilegedSupabase,
    supabase,
    parseAuthUser,
    logAdminAction,
    upload
  }: {
    privilegedSupabase: any;
    supabase: any;
    getDb?: () => any;
    saveDb?: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
    logAdminAction: (user: any, action: string, targetType: string, targetId: string, details?: any) => Promise<any>;
    upload: any;
  }
) {
  const getClient = () => {
    const client = privilegedSupabase || supabase;
    if (!client) {
      throw new Error("Supabase client is not available");
    }
    return client;
  };

  // Lazy Gemini client helper
  let aiClient: GoogleGenAI | null = null;
  const getAi = () => {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return aiClient;
  };

  // Helper for resilient Gemini content generation
  async function callGeminiAi(prompt: string, systemInstruction?: string, isJson: boolean = false) {
    const ai = getAi();
    const primaryModel = "gemini-2.5-flash";
    const backupModel = "gemini-2.5-flash-lite";

    const config: any = {};
    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }
    if (isJson) {
      config.responseMimeType = "application/json";
    }

    try {
      const response = await ai.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config: Object.keys(config).length > 0 ? config : undefined,
      });
      return response.text || "";
    } catch (err: any) {
      // console.warn(`Primary Gemini model failed, trying fallback:`, err?.message || err);
      try {
        const response = await ai.models.generateContent({
          model: backupModel,
          contents: prompt,
          config: Object.keys(config).length > 0 ? config : undefined,
        });
        return response.text || "";
      } catch (backupErr: any) {
        console.error(`Fallback Gemini model failed:`, backupErr?.message || backupErr);
        throw err;
      }
    }
  }

  // Robust JSON cleaner and parser that handles unescaped control characters & markdown
  function safeParseAiJson(rawText: string): any {
    if (!rawText) return null;

    let text = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Find outermost JSON structure
    const firstBrace = text.indexOf("{");
    const firstBracket = text.indexOf("[");
    let startIdx = -1;
    let isObject = false;

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      isObject = true;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      isObject = false;
    }

    if (startIdx !== -1) {
      const lastChar = isObject ? "}" : "]";
      const lastIdx = text.lastIndexOf(lastChar);
      if (lastIdx > startIdx) {
        text = text.substring(startIdx, lastIdx + 1);
      }
    }

    try {
      return JSON.parse(text);
    } catch (err1) {
      try {
        // Sanitize control characters inside string literals (e.g., raw unescaped newlines/tabs)
        const sanitized = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
          if (char === "\n") return "\\n";
          if (char === "\r") return "\\r";
          if (char === "\t") return "\\t";
          if (char === "\b") return "\\b";
          if (char === "\f") return "\\f";
          return "";
        });
        return JSON.parse(sanitized);
      } catch (err2) {
        // Fallback: structured regex field extraction
        const result: Record<string, any> = {};

        const titleMatch = text.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (titleMatch) {
          try { result.title = JSON.parse(`"${titleMatch[1]}"`); } catch { result.title = titleMatch[1]; }
        }

        const slugMatch = text.match(/"slug"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (slugMatch) {
          try { result.slug = JSON.parse(`"${slugMatch[1]}"`); } catch { result.slug = slugMatch[1]; }
        }

        const excerptMatch = text.match(/"excerpt"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (excerptMatch) {
          try { result.excerpt = JSON.parse(`"${excerptMatch[1]}"`); } catch { result.excerpt = excerptMatch[1]; }
        }

        const categoryMatch = text.match(/"category"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (categoryMatch) {
          try { result.category = JSON.parse(`"${categoryMatch[1]}"`); } catch { result.category = categoryMatch[1]; }
        }

        const metaTitleMatch = text.match(/"meta_title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (metaTitleMatch) {
          try { result.meta_title = JSON.parse(`"${metaTitleMatch[1]}"`); } catch { result.meta_title = metaTitleMatch[1]; }
        }

        const metaDescMatch = text.match(/"meta_description"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
        if (metaDescMatch) {
          try { result.meta_description = JSON.parse(`"${metaDescMatch[1]}"`); } catch { result.meta_description = metaDescMatch[1]; }
        }

        // HTML Content extraction
        const contentMatch = text.match(/"content"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:meta_title|meta_description|tags|social_posts)/);
        if (contentMatch) {
          result.content = contentMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t")
            .replace(/\\r/g, "");
        } else {
          const fallbackContentMatch = text.match(/"content"\s*:\s*"([\s\S]*?)"\s*\}/);
          if (fallbackContentMatch) {
            result.content = fallbackContentMatch[1]
              .replace(/\\"/g, '"')
              .replace(/\\n/g, "\n")
              .replace(/\\t/g, "\t");
          }
        }

        if (Object.keys(result).length > 0) {
          return result;
        }

        throw err1;
      }
    }
  }

  // ==========================================
  // PUBLIC BLOG ROUTES (Strictly Supabase Postgres)
  // ==========================================

  // 1. Get published blog posts (with pagination, category, tag, search)
  const getPublicBlogPosts = async (req: express.Request, res: express.Response) => {
    try {
      const { category, tag, search, page = "1", limit = "12", sort = "newest" } = req.query;
      const pageNum = Math.max(1, parseInt(String(page)) || 1);
      const limitNum = Math.min(50, Math.max(1, parseInt(String(limit)) || 12));
      const offset = (pageNum - 1) * limitNum;

      const client = getClient();
      let query = client
        .from("blog_posts")
        .select("*", { count: "exact" })
        .eq("status", "published");

      if (category && category !== "all" && category !== "All") {
        query = query.ilike("category", String(category));
      }

      if (tag) {
        query = query.contains("tags", [String(tag)]);
      }

      if (search) {
        const s = String(search).trim();
        query = query.or(`title.ilike.%${s}%,excerpt.ilike.%${s}%,content.ilike.%${s}%`);
      }

      if (sort === "popular") {
        query = query.order("views_count", { ascending: false });
      } else {
        query = query.order("published_at", { ascending: false, nullsFirst: false });
      }

      query = query.range(offset, offset + limitNum - 1);

      const { data, count, error } = await query;
      if (error) {
        console.error("[Blog Public] Supabase error fetching posts:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch blog posts" });
      }

      const posts = data || [];
      const totalCount = count || 0;

      return res.json({
        posts,
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      });
    } catch (err: any) {
      console.error("[Blog Public] Error fetching posts:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch blog posts" });
    }
  };

  router.get("/blog/posts", getPublicBlogPosts);

  // 2. Get single blog post by slug (and increment views_count)
  const getPublicBlogPostBySlug = async (req: express.Request, res: express.Response) => {
    try {
      const { slug } = req.params;
      if (!slug) return res.status(400).json({ error: "Slug is required" });

      const client = getClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      let query = client.from("blog_posts").select("*");
      if (isUuid) {
        query = query.or(`slug.eq.${slug},id.eq.${slug}`);
      } else {
        query = query.eq("slug", slug);
      }

      const { data: post, error } = await query.maybeSingle();
      if (error) {
        console.error("[Blog Public Post] Supabase error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch blog post" });
      }

      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // Increment views_count asynchronously
      const newViews = (post.views_count || 0) + 1;
      client
        .from("blog_posts")
        .update({ views_count: newViews })
        .eq("id", post.id)
        .then(() => {})
        .catch(() => {});
      post.views_count = newViews;

      // Get related posts (3 posts in same category, excluding this one)
      let related: any[] = [];
      if (post.category) {
        const { data: relatedData } = await client
          .from("blog_posts")
          .select("id, slug, title, excerpt, cover_image_url, category, author_name, published_at, read_time_minutes")
          .eq("status", "published")
          .neq("id", post.id)
          .eq("category", post.category)
          .order("published_at", { ascending: false })
          .limit(3);
        related = relatedData || [];
      }

      return res.json({ post, related, relatedPosts: related });
    } catch (err: any) {
      console.error("[Blog Public Post] Error fetching post:", err);
      return res.status(500).json({ error: err.message || "Failed to fetch blog post" });
    }
  };

  router.get("/blog/posts/:slug", getPublicBlogPostBySlug);

  // 3. Get blog categories and counts
  const getBlogCategories = async (req: express.Request, res: express.Response) => {
    try {
      const client = getClient();
      const defaultCategories = [
        "Influencer Marketing",
        "Creator Economy",
        "Platform Updates",
        "Guides & Playbooks",
        "Case Studies",
        "Monetization & Payouts"
      ];

      const { data, error } = await client
        .from("blog_posts")
        .select("category")
        .eq("status", "published");

      if (error) {
        console.error("[Blog Categories] Error:", error);
        return res.status(500).json({ error: error.message || "Failed to get categories" });
      }

      const counts: Record<string, number> = {};
      defaultCategories.forEach((c) => (counts[c] = 0));

      (data || []).forEach((p: any) => {
        if (p.category) {
          counts[p.category] = (counts[p.category] || 0) + 1;
        }
      });

      const result = Object.entries(counts).map(([name, count]) => ({
        name,
        slug: slugify(name),
        count
      }));

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to get categories" });
    }
  };

  router.get("/blog/categories", getBlogCategories);

  // 4. Featured / Recent Posts
  const getFeaturedBlogPosts = async (req: express.Request, res: express.Response) => {
    try {
      const client = getClient();
      const { data, error } = await client
        .from("blog_posts")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("[Blog Featured] Error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch featured posts" });
      }

      return res.json(data || []);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch featured posts" });
    }
  };

  router.get("/blog/featured", getFeaturedBlogPosts);

  // 5. Dynamic Sitemap for Blog (XML)
  const getBlogSitemap = async (req: express.Request, res: express.Response) => {
    try {
      const client = getClient();
      const { data: posts, error } = await client
        .from("blog_posts")
        .select("slug, updated_at, published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (error) {
        console.error("[Blog Sitemap] Error:", error);
      }

      const postList = posts || [];
      const baseUrl = "https://ybex.io";
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      xml += `  <url>\n    <loc>${baseUrl}/blog</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

      postList.forEach((p) => {
        const lastMod = p.updated_at || p.published_at || new Date().toISOString();
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/blog/${p.slug}</loc>\n`;
        xml += `    <lastmod>${new Date(lastMod).toISOString().split("T")[0]}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      });

      xml += `</urlset>`;

      res.header("Content-Type", "application/xml");
      return res.send(xml);
    } catch (err: any) {
      return res.status(500).send("Error generating sitemap");
    }
  };

  router.get("/blog/sitemap.xml", getBlogSitemap);
  router.get("/sitemap-blog.xml", getBlogSitemap);
  app.get("/sitemap-blog.xml", getBlogSitemap);

  // ==========================================
  // ADMIN BLOG ROUTES (Authenticated + Admin)
  // ==========================================

  const requireAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = await parseAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required", _status: 401 });
    }
    const isAdmin = user.role === "admin" || user.team_role === "sub_admin" || user.role === "sub_admin";
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin authorization required", _status: 403 });
    }
    (req as any).adminUser = user;
    next();
  };

  // 6. Admin: Get all blog posts (with filter by status, category, search, and pagination)
  router.get("/admin/blog/posts", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { status, category, search, page = "1", limit = "20" } = req.query;
      const pageNum = Math.max(1, parseInt(String(page)) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
      const offset = (pageNum - 1) * limitNum;

      const client = getClient();
      let query = client.from("blog_posts").select("*", { count: "exact" });

      if (status && status !== "all") {
        query = query.eq("status", String(status));
      }
      if (category && category !== "all") {
        query = query.ilike("category", String(category));
      }
      if (search) {
        const s = String(search).trim();
        query = query.or(`title.ilike.%${s}%,slug.ilike.%${s}%,meta_description.ilike.%${s}%`);
      }

      query = query.order("created_at", { ascending: false }).range(offset, offset + limitNum - 1);

      const { data, count, error } = await query;
      if (error) {
        console.error("[Admin Blog] Supabase error:", error);
        return res.status(500).json({ error: error.message || "Failed to load admin blog posts" });
      }

      const posts = data || [];
      const totalCount = count || 0;

      return res.json({
        posts,
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      });
    } catch (err: any) {
      console.error("[Admin Blog] Error:", err);
      return res.status(500).json({ error: err.message || "Failed to load admin blog posts" });
    }
  });

  // 7. Admin: Get single post by ID
  router.get("/admin/blog/posts/:id", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const client = getClient();

      const { data, error } = await client.from("blog_posts").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[Admin Blog Post] Error:", error);
        return res.status(500).json({ error: error.message || "Failed to fetch post" });
      }

      if (!data) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch post" });
    }
  });

  // 8. Admin: Create new blog post
  router.post("/admin/blog/posts", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const {
        title,
        slug: requestedSlug,
        excerpt,
        content,
        cover_image_url,
        category,
        tags,
        status = "draft",
        published_at,
        meta_description,
        ai_generated = false
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required." });
      }

      // Enforce status to be either 'draft' or 'published' strictly matching Postgres CHECK constraint
      const safeStatus = status === "published" ? "published" : "draft";

      let slug = requestedSlug ? slugify(requestedSlug) : slugify(title);
      if (!slug) slug = `post-${Date.now()}`;

      // Check slug uniqueness in Supabase
      const client = getClient();
      let uniqueSlug = slug;
      let suffix = 1;

      while (true) {
        const { data: existing } = await client
          .from("blog_posts")
          .select("id")
          .eq("slug", uniqueSlug)
          .maybeSingle();

        if (!existing) break;
        uniqueSlug = `${slug}-${suffix}`;
        suffix++;
      }

      const nowIso = new Date().toISOString();
      const actualPublishedAt = safeStatus === "published" ? published_at || nowIso : published_at || null;

      const newPost = {
        id: crypto.randomUUID(),
        slug: uniqueSlug,
        title: title.trim(),
        excerpt: excerpt?.trim() || "",
        content: content.trim(),
        cover_image_url: cover_image_url || null,
        category: category || "Influencer Marketing",
        tags: Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        status: safeStatus,
        ai_generated: Boolean(ai_generated),
        author_id: adminUser?.id || null,
        published_at: actualPublishedAt,
        views_count: 0,
        meta_description: meta_description?.trim() || excerpt?.trim() || "",
        created_at: nowIso,
        updated_at: nowIso
      };

      const { data, error } = await client.from("blog_posts").insert(newPost).select().single();
      if (error) {
        console.error("[Blog Create] Supabase error:", error);
        return res.status(500).json({ error: error.message || "Failed to create blog post in Supabase" });
      }

      await logAdminAction(adminUser, "create_blog_post", "blog_post", data.id, {
        title: data.title,
        status: data.status,
        ai_generated: data.ai_generated
      });

      return res.json({ ok: true, post: data });
    } catch (err: any) {
      console.error("[Blog Create Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to create blog post" });
    }
  });

  // 9. Admin: Update blog post
  router.put("/admin/blog/posts/:id", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { id } = req.params;
      const {
        title,
        slug: requestedSlug,
        excerpt,
        content,
        cover_image_url,
        category,
        tags,
        status,
        published_at,
        meta_description,
        ai_generated
      } = req.body;

      const client = getClient();
      const nowIso = new Date().toISOString();

      const updatePayload: any = {
        updated_at: nowIso
      };

      if (title !== undefined) updatePayload.title = title.trim();
      if (requestedSlug !== undefined) updatePayload.slug = slugify(requestedSlug);
      if (excerpt !== undefined) updatePayload.excerpt = excerpt?.trim();
      if (content !== undefined) updatePayload.content = content.trim();
      if (cover_image_url !== undefined) updatePayload.cover_image_url = cover_image_url;
      if (category !== undefined) updatePayload.category = category;
      if (tags !== undefined) {
        updatePayload.tags = Array.isArray(tags)
          ? tags
          : typeof tags === "string"
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];
      }
      if (status !== undefined) {
        // Enforce CHECK constraint: status IN ('draft', 'published')
        const safeStatus = status === "published" ? "published" : "draft";
        updatePayload.status = safeStatus;
        if (safeStatus === "published" && !published_at) {
          updatePayload.published_at = nowIso;
        }
      }
      if (published_at !== undefined) updatePayload.published_at = published_at;
      if (meta_description !== undefined) updatePayload.meta_description = meta_description?.trim();
      if (ai_generated !== undefined) updatePayload.ai_generated = Boolean(ai_generated);

      const { data, error } = await client
        .from("blog_posts")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Blog Update] Supabase error:", error);
        return res.status(500).json({ error: error.message || "Failed to update blog post" });
      }

      if (!data) {
        return res.status(404).json({ error: "Post not found" });
      }

      await logAdminAction(adminUser, "update_blog_post", "blog_post", id, {
        title: data.title,
        status: data.status
      });

      return res.json({ ok: true, post: data });
    } catch (err: any) {
      console.error("[Blog Update Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to update blog post" });
    }
  });

  // 10. Admin: Delete blog post
  router.delete("/admin/blog/posts/:id", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { id } = req.params;
      const client = getClient();

      const { error } = await client.from("blog_posts").delete().eq("id", id);
      if (error) {
        console.error("[Blog Delete] Supabase error:", error);
        return res.status(500).json({ error: error.message || "Failed to delete blog post" });
      }

      await logAdminAction(adminUser, "delete_blog_post", "blog_post", id);
      return res.json({ ok: true, message: "Blog post deleted successfully" });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // 11. Admin: Quick Publish / Unpublish Post
  router.post("/admin/blog/posts/:id/publish", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { id } = req.params;
      const nowIso = new Date().toISOString();
      const client = getClient();

      const { data, error } = await client
        .from("blog_posts")
        .update({
          status: "published",
          published_at: nowIso,
          updated_at: nowIso
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Blog Publish] Supabase error:", error);
        return res.status(500).json({ error: error.message || "Failed to publish post" });
      }

      if (!data) {
        return res.status(404).json({ error: "Post not found" });
      }

      await logAdminAction(adminUser, "publish_blog_post", "blog_post", id);
      return res.json({ ok: true, post: data });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to publish post" });
    }
  });

  router.post("/admin/blog/posts/:id/unpublish", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const { id } = req.params;
      const nowIso = new Date().toISOString();
      const client = getClient();

      const { data, error } = await client
        .from("blog_posts")
        .update({
          status: "draft",
          updated_at: nowIso
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[Blog Unpublish] Supabase error:", error);
        return res.status(500).json({ error: error.message || "Failed to unpublish post" });
      }

      if (!data) {
        return res.status(404).json({ error: "Post not found" });
      }

      await logAdminAction(adminUser, "unpublish_blog_post", "blog_post", id);
      return res.json({ ok: true, post: data });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to unpublish post" });
    }
  });

  // 12. Admin: AI Generation Endpoint
  router.post("/admin/blog/generate", requireAdmin, async (req: express.Request, res: express.Response) => {
    try {
      const {
        action = "full_draft", // 'full_draft', 'outline', 'expand_section', 'seo_optimize', 'improve_writing'
        topic,
        keywords = [],
        tone = "Authoritative & Actionable",
        target_audience = "Brands and Content Creators",
        current_title,
        current_content,
        section_heading,
        category = "Influencer Marketing"
      } = req.body;

      const systemInstruction = `You are the Lead Content Strategist and Senior Editor for YBEX (ybex.io) — India's premier influencer marketing and creator collaboration platform.
YBEX connects top creators with ambitious D2C brands, enterprise companies, and agencies for sponsored campaigns, UGC, live deals, escrow-protected payouts, and performance tracking.

Your writing guidelines:
1. Tone: Deeply knowledgeable, punchy, actionable, high-retention, modern, data-backed, and direct. Avoid generic AI fluff, clichés (like "in this fast-paced world"), and bloated filler.
2. Structure: Use crisp H2 and H3 subheadings, bullet points, callout takeaways, real-world examples, and actionable step-by-step frameworks.
3. Brand alignment: Highlight how YBEX solves real creator marketing bottlenecks (e.g., escrow safety, verified creator engagement rates, fast brief turnaround, authentic UGC).
4. Output format: Provide clean, semantic HTML format for the body content (using <h2>, <h3>, <p>, <ul>, <li>, <blockquote>, <strong>, <em>, etc.) so it can be directly imported into the rich text editor.`;

      let userPrompt = "";

      if (action === "full_draft") {
        userPrompt = `Write a comprehensive, publication-ready blog article on the topic: "${topic || current_title}".
Category: ${category}
Target Audience: ${target_audience}
Tone: ${tone}
Primary Keywords: ${Array.isArray(keywords) ? keywords.join(", ") : keywords}

Return your response strictly as a JSON object with the following schema:
{
  "title": "Compelling, high-CTR article headline (60 chars max)",
  "slug": "url-friendly-slug",
  "excerpt": "Engaging 2-sentence summary hook for social preview and search (140-160 chars)",
  "category": "${category}",
  "tags": ["3-5 relevant keyword tags"],
  "content": "Full article HTML content (minimum 800-1200 words) with structured <h2>, <h3>, <p>, <ul>, <blockquote> sections and practical takeaways",
  "meta_title": "SEO Title | YBEX Blog",
  "meta_description": "SEO Meta description (under 155 chars)",
  "social_posts": {
    "linkedin": "A high-engagement LinkedIn post summarizing 3 key takeaways with hashtags",
    "twitter": "A viral Twitter/X hook thread starter (under 280 chars)",
    "instagram_caption": "An Instagram carousel caption with key bullet points and hashtags"
  }
}
Return ONLY valid raw JSON with no markdown backtick wrapping.`;
      } else if (action === "outline") {
        userPrompt = `Generate a detailed structural outline for a high-performing blog post on: "${topic || current_title}".
Target Audience: ${target_audience}
Tone: ${tone}

Return your response strictly as a JSON object:
{
  "title": "Recommended Headline",
  "excerpt": "Brief hook",
  "outline_sections": [
    { "heading": "Introduction & The Current Problem", "key_points": ["Point 1", "Point 2"] },
    { "heading": "Core Framework / Strategy", "key_points": ["Step 1", "Step 2", "Step 3"] },
    { "heading": "Case Example & Metric Benchmarks", "key_points": ["Data point", "Example"] },
    { "heading": "Key Takeaways & Action Checklist", "key_points": ["Action 1", "Action 2"] }
  ]
}
Return ONLY valid raw JSON.`;
      } else if (action === "expand_section") {
        userPrompt = `Expand this specific blog section into 2-3 engaging, well-written paragraphs with bullet points or examples:
Section Heading: "${section_heading || "Strategy Details"}"
Context / Notes: "${topic || current_content || "Practical implementation tactics"}"
Tone: ${tone}

Return clean semantic HTML (<p>, <ul>, <li>, <strong>). Do not wrap in JSON.`;
      } else if (action === "seo_optimize") {
        userPrompt = `Given the following blog post details, generate optimized SEO metadata and distribution copy:
Title: "${current_title || topic}"
Content Preview: "${(current_content || "").substring(0, 1500)}"

Return strictly a JSON object:
{
  "meta_title": "Optimized SEO title under 60 chars",
  "meta_description": "Compelling search snippet under 155 chars",
  "excerpt": "Crisp 2-sentence hook",
  "suggested_tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"],
  "social_posts": {
    "linkedin": "LinkedIn copy with bullet takeaways and #hashtags",
    "twitter": "X/Twitter post hook with #hashtags",
    "instagram_caption": "Instagram caption"
  }
}
Return ONLY valid raw JSON.`;
      } else {
        // improve_writing
        userPrompt = `Polishing and enhancing the following blog content. Keep the HTML tags intact, improve readability, strengthen hooks, remove filler, and increase tone authority:
Content:
${current_content || topic}

Return only the improved semantic HTML content.`;
      }

      const isJsonAction = action === "full_draft" || action === "outline" || action === "seo_optimize";
      const generatedText = await callGeminiAi(userPrompt, systemInstruction, isJsonAction);

      if (isJsonAction) {
        try {
          const parsed = safeParseAiJson(generatedText);
          if (parsed && typeof parsed === "object") {
            return res.json({ ok: true, action, data: parsed });
          }
          throw new Error("Invalid parsed object structure");
        } catch (parseErr) {
          console.warn("[Blog AI] JSON parse error, returning raw text:", parseErr);
          return res.json({
            ok: true,
            action,
            data: {
              title: topic || current_title || "Generated Article",
              content: generatedText,
              raw_output: generatedText
            }
          });
        }
      }

      return res.json({ ok: true, action, data: { html: generatedText } });
    } catch (err: any) {
      console.error("[Blog AI Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to generate AI blog content" });
    }
  });

  // 13. Admin: Cover Image Upload
  router.post(
    "/admin/blog/upload-cover",
    requireAdmin,
    upload.single("file"),
    async (req: express.Request, res: express.Response) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "No image file uploaded" });
        }

        const ext = file.originalname ? file.originalname.split(".").pop() : "webp";
        const filename = `blog-cover-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;

        const client = getClient();
        if (client?.storage) {
          try {
            const { error: uploadError } = await client.storage
              .from("cover-images")
              .upload(filename, file.buffer, {
                contentType: file.mimetype,
                upsert: true
              });

            if (!uploadError) {
              const { data } = client.storage.from("cover-images").getPublicUrl(filename);
              if (data?.publicUrl) {
                return res.json({ ok: true, url: data.publicUrl });
              }
            }
          } catch (e) {}

          // Try banner-images bucket
          try {
            const { error: bErr } = await client.storage
              .from("banner-images")
              .upload(filename, file.buffer, {
                contentType: file.mimetype,
                upsert: true
              });

            if (!bErr) {
              const { data } = client.storage.from("banner-images").getPublicUrl(filename);
              if (data?.publicUrl) {
                return res.json({ ok: true, url: data.publicUrl });
              }
            }
          } catch (e) {}
        }

        // Data URI fallback for image preview if storage bucket is not configured
        const base64Data = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
        return res.json({ ok: true, url: base64Data });
      } catch (err: any) {
        console.error("[Blog Image Upload Error]:", err);
        return res.status(500).json({ error: "Failed to upload cover image" });
      }
    }
  );
}
