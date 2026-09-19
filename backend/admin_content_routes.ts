import express from "express";
import crypto from "crypto";

const getIsoNow = () => new Date().toISOString();

// Admin-managed marketing/content surfaces: dashboard banners (backs
// BannerManager.jsx), and the public landing page's brand-logo strip +
// testimonial reviews (each has a public GET + admin-only POST/DELETE).
export function setupAdminContentRoutes(
  app: express.Application,
  router: express.Router,
  {
    supabase,
    privilegedSupabase,
    getDb,
    saveDb,
    parseAuthUser,
  }: {
    supabase: any;
    privilegedSupabase: any;
    getDb: () => any;
    saveDb: (db: any) => void;
    parseAuthUser: (req: express.Request) => Promise<any>;
  }
) {
  // Helper to map DB row to Admin UI format
  const mapDbToAdminBanner = (b: any) => ({
    id: b.id,
    type: b.target_dashboard === 'all' ? 'Common' : (b.target_dashboard === 'brand' ? 'Brand' : 'Influencer'),
    placement: 'Dashboard Hero Carousel', // default for now
    link: b.link_url || "",
    status: b.active ? "Live" : "Draft",
    imgUrl: b.image_url,
    start_date: b.start_date,
    end_date: b.end_date,
    created_at: b.created_at,
    created_by: b.created_by
  });

  router.get("/admin/banners", async (req, res) => { console.log("HITTING GET BANNERS");
    const user = await parseAuthUser(req);
    if (!user || (user.role !== "admin" && user.team_role !== "admin" && user.team_role !== "sub_admin")) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    
    if (privilegedSupabase || supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase).from('banners').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          return res.json(data.map(mapDbToAdminBanner));
        }
      } catch (e) { console.error("Error fetching admin banners from Supabase:", e); }
    }
    
    const db = getDb();
    res.json(db.banners || []);
  });

  router.post("/admin/banners", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== "admin" && user.team_role !== "admin" && user.team_role !== "sub_admin")) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    const { type, placement, link, status, imgUrl, start_date, end_date } = req.body || {};
    if (!imgUrl) return res.status(400).json({ error: "imgUrl is required" });

    const newBanner = {
      id: crypto.randomUUID(),
      target_dashboard: type === 'Common' ? 'all' : (type === 'Brand' ? 'brand' : 'creator'),
      link_url: link || null,
      active: status === 'Live',
      image_url: imgUrl,
      start_date: start_date || null,
      end_date: end_date || null,
      created_at: getIsoNow(),
      created_by: user.user_id || user.id
    };

    if (privilegedSupabase || supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase).from('banners').insert(newBanner).select();
        if (!error && data && data[0]) {
          return res.json(mapDbToAdminBanner(data[0]));
        } else {
          console.error("Supabase insert banner error:", error);
        }
      } catch (e) { console.error("Exception inserting banner:", e); }
    }

    const db = getDb();
    db.banners = db.banners || [];
    const localBanner = {
      id: newBanner.id,
      type: type || "Influencer",
      placement: placement || "Dashboard Hero Carousel",
      link: link || "",
      status: status || "Live",
      imgUrl,
      start_date: start_date || null,
      end_date: end_date || null,
      created_at: newBanner.created_at,
      created_by: newBanner.created_by
    };
    db.banners.push(localBanner);
    saveDb(db);
    res.json(localBanner);
  });

  router.put("/admin/banners/:id", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== "admin" && user.team_role !== "admin" && user.team_role !== "sub_admin")) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    const { id } = req.params;
    const { type, placement, link, status, imgUrl, start_date, end_date } = req.body || {};

    let updateData: any = {};
    if (type !== undefined) updateData.target_dashboard = type === 'Common' ? 'all' : (type === 'Brand' ? 'brand' : 'creator');
    if (link !== undefined) updateData.link_url = link || null;
    if (status !== undefined) updateData.active = status === 'Live';
    if (imgUrl !== undefined) updateData.image_url = imgUrl;
    if (start_date !== undefined) updateData.start_date = start_date || null;
    if (end_date !== undefined) updateData.end_date = end_date || null;

    if (privilegedSupabase || supabase) {
      try {
        const { data, error } = await (privilegedSupabase || supabase).from('banners').update(updateData).eq('id', id).select();
        if (!error && data && data[0]) {
          return res.json(mapDbToAdminBanner(data[0]));
        }
      } catch (e) { console.error("Exception updating banner:", e); }
    }

    const db = getDb();
    db.banners = db.banners || [];
    const banner = db.banners.find((b: any) => b.id === id);
    if (!banner) return res.status(404).json({ error: "Banner not found" });

    if (type !== undefined) banner.type = type;
    if (placement !== undefined) banner.placement = placement;
    if (link !== undefined) banner.link = link;
    if (status !== undefined) banner.status = status;
    if (imgUrl !== undefined) banner.imgUrl = imgUrl;
    if (start_date !== undefined) banner.start_date = start_date;
    if (end_date !== undefined) banner.end_date = end_date;

    saveDb(db);
    res.json(banner);
  });

  router.delete("/admin/banners/:id", async (req, res) => {
    const user = await parseAuthUser(req);
    if (!user || (user.role !== "admin" && user.team_role !== "admin" && user.team_role !== "sub_admin")) {
      return res.status(403).json({ detail: "Admin only", _status: 403 });
    }
    const { id } = req.params;

    if (privilegedSupabase || supabase) {
      try {
        const { error } = await (privilegedSupabase || supabase).from('banners').delete().eq('id', id);
        console.log("Delete banner error:", error);
      } catch (e) { console.error("Exception deleting banner:", e); }
    }

    const db = getDb();
    db.banners = db.banners || [];
    const before = db.banners.length;
    db.banners = db.banners.filter((b: any) => b.id !== id);
    if (db.banners.length !== before) {
      saveDb(db);
    }
    res.json({ ok: true });
  });

  router.get(["/landing-brands", "/admin/landing-brands"], async (req, res) => {
    const db = getDb();
    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      try {
        const { data, error } = await activeClient.from('landing_brands').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) return res.json(data);
      } catch(e) {
        console.error("Error fetching landing_brands from Supabase:", e);
      }
    }
    const defaultBrands = [
      { id: "1", name: "Nike", logo_url: "https://cdn.iconscout.com/icon/free/png-512/free-nike-logo-icon-download-in-svg-png-gif-file-formats--brand-shoe-company-logo-vol-1-pack-logos-icons-282245.png?f=webp&w=256" },
      { id: "2", name: "Puma", logo_url: "https://cdn.iconscout.com/icon/free/png-512/free-puma-logo-icon-download-in-svg-png-gif-file-formats--brand-shoe-company-logo-vol-3-pack-logos-icons-282229.png?f=webp&w=256" },
      { id: "3", name: "Adidas", logo_url: "https://cdn.iconscout.com/icon/free/png-512/free-adidas-logo-icon-download-in-svg-png-gif-file-formats--brand-sneakers-shoe-company-logo-vol-1-pack-logos-icons-282117.png?f=webp&w=256" }
    ];
    res.json((db as any).landing_brands || defaultBrands);
  });

  router.post("/admin/landing-brands", async (req, res) => {
    const { name, logo_url } = req.body;
    const newBrand = {
      id: req.body.id || crypto.randomUUID(),
      name: name || "Brand",
      logo_url: logo_url || "",
      created_at: new Date().toISOString()
    };
    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      try {
        const { data, error } = await activeClient.from('landing_brands').insert(newBrand).select();
        if (error) {
          console.error("Supabase insert error for landing_brands:", error);
        } else if (data && data[0]) {
          const db = getDb();
          if (!(db as any).landing_brands) (db as any).landing_brands = [];
          (db as any).landing_brands.unshift(data[0]);
          saveDb(db);
          return res.json(data[0]);
        }
      } catch(e) {
        console.error("Exception inserting landing_brands to Supabase:", e);
      }
    }
    const db = getDb();
    if (!(db as any).landing_brands) (db as any).landing_brands = [];
    (db as any).landing_brands.unshift(newBrand);
    saveDb(db);
    res.json(newBrand);
  });

  router.delete("/admin/landing-brands/:id", async (req, res) => {
    const { id } = req.params;
    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      try {
        await activeClient.from('landing_brands').delete().eq('id', id);
      } catch(e) {
        console.error("Error deleting landing_brands from Supabase:", e);
      }
    }
    const db = getDb();
    if ((db as any).landing_brands) {
      (db as any).landing_brands = (db as any).landing_brands.filter((b: any) => b.id !== id);
      saveDb(db);
    }
    res.json({ ok: true });
  });

  router.get(["/landing-reviews", "/admin/landing-reviews"], async (req, res) => {
    const db = getDb();
    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      try {
        const { data, error } = await activeClient.from('landing_reviews').select('*').order('created_at', { ascending: false });
        if (data && data.length > 0) return res.json(data);
      } catch(e) {
        console.error("Error fetching landing_reviews from Supabase:", e);
      }
    }
    const defaultReviews = [
      {
        id: "1",
        author_name: "Aarav Sharma",
        author_role: "Tech Creator (150K)",
        author_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
        content: "Ybex completely transformed how I land brand sponsorships. Payments are guaranteed in escrow and payout is super fast!",
        category: "Tech",
        type: "creator"
      }
    ];
    res.json((db as any).landing_reviews || defaultReviews);
  });

  router.post("/admin/landing-reviews", async (req, res) => {
    const newReview = {
      id: req.body.id || crypto.randomUUID(),
      author_name: req.body.author_name || "",
      author_role: req.body.author_role || "",
      author_image: req.body.author_image || "",
      content: req.body.content || "",
      category: req.body.category || "",
      highlight_text: req.body.highlight_text || "",
      highlight_color: req.body.highlight_color || "purple",
      type: req.body.type || "creator",
      created_at: new Date().toISOString()
    };
    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      try {
        const { data, error } = await activeClient.from('landing_reviews').insert(newReview).select();
        if (error) {
          console.error("Supabase insert error for landing_reviews:", error);
        } else if (data && data[0]) {
          const db = getDb();
          if (!(db as any).landing_reviews) (db as any).landing_reviews = [];
          (db as any).landing_reviews.unshift(data[0]);
          saveDb(db);
          return res.json(data[0]);
        }
      } catch(e) {
        console.error("Exception inserting landing_reviews to Supabase:", e);
      }
    }
    const db = getDb();
    if (!(db as any).landing_reviews) (db as any).landing_reviews = [];
    (db as any).landing_reviews.unshift(newReview);
    saveDb(db);
    res.json(newReview);
  });

  router.delete("/admin/landing-reviews/:id", async (req, res) => {
    const { id } = req.params;
    const activeClient = privilegedSupabase || supabase;
    if (activeClient) {
      try {
        await activeClient.from('landing_reviews').delete().eq('id', id);
      } catch(e) {
        console.error("Error deleting landing_reviews from Supabase:", e);
      }
    }
    const db = getDb();
    if ((db as any).landing_reviews) {
      (db as any).landing_reviews = (db as any).landing_reviews.filter((r: any) => r.id !== id);
      saveDb(db);
    }
    res.json({ ok: true });
  });
}
