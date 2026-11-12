/*
# Create website content management tables

1. Purpose
   Gives the owner full control to edit website content from the Settings page
   without touching code. Currently testimonials, FAQs, gallery images,
   service areas, and hero/about text are hardcoded in the frontend.
   This migration moves them into the database.

2. New Tables
   - `website_testimonials` — customer reviews shown on the website
   - `website_faqs` — frequently asked questions
   - `website_gallery` — project gallery images
   - `website_service_areas` — cities/regions served

3. Modified Tables
   - `company_settings` — added columns for editable website text

4. Security
   - RLS enabled on all new tables.
   - SELECT: public (anon + authenticated).
   - INSERT/UPDATE/DELETE: authenticated staff only.

5. Seed Data
   - Pre-populates all new tables with the current hardcoded content.
*/

CREATE TABLE IF NOT EXISTS website_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  text text NOT NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  location text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_testimonials" ON website_testimonials;
CREATE POLICY "public_select_testimonials" ON website_testimonials FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_testimonials" ON website_testimonials;
CREATE POLICY "staff_insert_testimonials" ON website_testimonials FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_testimonials" ON website_testimonials;
CREATE POLICY "staff_update_testimonials" ON website_testimonials FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_testimonials" ON website_testimonials;
CREATE POLICY "staff_delete_testimonials" ON website_testimonials FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── website_faqs ──
CREATE TABLE IF NOT EXISTS website_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_faqs" ON website_faqs;
CREATE POLICY "public_select_faqs" ON website_faqs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_faqs" ON website_faqs;
CREATE POLICY "staff_insert_faqs" ON website_faqs FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_faqs" ON website_faqs;
CREATE POLICY "staff_update_faqs" ON website_faqs FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_faqs" ON website_faqs;
CREATE POLICY "staff_delete_faqs" ON website_faqs FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── website_gallery ──
CREATE TABLE IF NOT EXISTS website_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_gallery" ON website_gallery;
CREATE POLICY "public_select_gallery" ON website_gallery FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_gallery" ON website_gallery;
CREATE POLICY "staff_insert_gallery" ON website_gallery FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_gallery" ON website_gallery;
CREATE POLICY "staff_update_gallery" ON website_gallery FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_gallery" ON website_gallery;
CREATE POLICY "staff_delete_gallery" ON website_gallery FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── website_service_areas ──
CREATE TABLE IF NOT EXISTS website_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE website_service_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_service_areas" ON website_service_areas;
CREATE POLICY "public_select_service_areas" ON website_service_areas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_service_areas" ON website_service_areas;
CREATE POLICY "staff_insert_service_areas" ON website_service_areas FOR INSERT
  TO authenticated WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_update_service_areas" ON website_service_areas;
CREATE POLICY "staff_update_service_areas" ON website_service_areas FOR UPDATE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

DROP POLICY IF EXISTS "staff_delete_service_areas" ON website_service_areas;
CREATE POLICY "staff_delete_service_areas" ON website_service_areas FOR DELETE
  TO authenticated USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff');

-- ── Extend company_settings with website text fields ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'hero_heading') THEN
    ALTER TABLE company_settings ADD COLUMN hero_heading text NOT NULL DEFAULT 'Professional Gutter Cleaning & Exterior Maintenance in Brampton';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'hero_subheading') THEN
    ALTER TABLE company_settings ADD COLUMN hero_subheading text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'about_heading') THEN
    ALTER TABLE company_settings ADD COLUMN about_heading text NOT NULL DEFAULT 'Built on Quality & Trust';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'about_paragraph_1') THEN
    ALTER TABLE company_settings ADD COLUMN about_paragraph_1 text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'about_paragraph_2') THEN
    ALTER TABLE company_settings ADD COLUMN about_paragraph_2 text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'about_paragraph_3') THEN
    ALTER TABLE company_settings ADD COLUMN about_paragraph_3 text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'cta_heading') THEN
    ALTER TABLE company_settings ADD COLUMN cta_heading text NOT NULL DEFAULT 'Ready to Get Started?';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'cta_subheading') THEN
    ALTER TABLE company_settings ADD COLUMN cta_subheading text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'services_intro') THEN
    ALTER TABLE company_settings ADD COLUMN services_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'process_intro') THEN
    ALTER TABLE company_settings ADD COLUMN process_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'gallery_intro') THEN
    ALTER TABLE company_settings ADD COLUMN gallery_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'testimonials_intro') THEN
    ALTER TABLE company_settings ADD COLUMN testimonials_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'faq_intro') THEN
    ALTER TABLE company_settings ADD COLUMN faq_intro text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'contact_intro') THEN
    ALTER TABLE company_settings ADD COLUMN contact_intro text NOT NULL DEFAULT 'Have a question or ready to book? Reach out — we are here to help.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'hours_label') THEN
    ALTER TABLE company_settings ADD COLUMN hours_label text NOT NULL DEFAULT 'Mon – Sat';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_settings' AND column_name = 'hours_value') THEN
    ALTER TABLE company_settings ADD COLUMN hours_value text NOT NULL DEFAULT '8:00 AM – 6:00 PM';
  END IF;
END $$;

-- ── Seed: testimonials ──
INSERT INTO website_testimonials (name, text, rating, location, display_order, active)
VALUES
  ('Benjamin Wood', 'Outstanding service from start to finish. The team went above and beyond on our home renovation project and exceeded all our expectations.', 5, 'Brampton, ON', 0, true),
  ('Emma Thompson', 'Exceptional quality and professionalism throughout. Highly recommend their gutter and exterior services in the Brampton area!', 5, 'Mississauga, ON', 1, true),
  ('Oliver Hartman', 'Incredibly responsive and efficient. They completed our project on time and within budget. A top-notch job well done.', 5, 'Toronto, ON', 2, true)
ON CONFLICT DO NOTHING;

-- ── Seed: FAQs ──
INSERT INTO website_faqs (question, answer, display_order, active)
VALUES
  ('What areas do you serve?', 'We proudly serve Brampton, Mississauga, Toronto, and the surrounding Greater Toronto Area. This includes Caledon, Vaughan, Etobicoke, Scarborough, Markham, and other nearby communities. If you are unsure whether we cover your area, give us a call at 437-440-4072 and we will let you know right away.', 0, true),
  ('Do you offer free estimates?', 'Yes. Every service comes with a free, no-obligation estimate. Book online or call us and we will assess the job, provide a clear upfront quote, and answer any questions you have before any work begins. There is no pressure and no hidden fees — the price we quote is the price you pay.', 1, true),
  ('How quickly can you come out?', 'For most services, we can schedule a visit within 2 to 3 business days. For urgent issues like active leaks or water damage, we do our best to accommodate same-day or next-day calls to minimize damage to your property. Call us as early as possible for urgent requests so we can prioritize your appointment.', 2, true),
  ('Are you insured and licensed?', 'Yes. Our team is fully licensed and insured to operate in Brampton and across the Greater Toronto Area. We carry comprehensive liability insurance and WSIB coverage, so you are fully protected. We take pride in doing every job safely and to code, giving you complete peace of mind when you hire us.', 3, true),
  ('What payment methods do you accept?', 'We accept e-transfer, cash, and online card payments via Square for your convenience. Payment is due upon completion of the work, and you will receive a detailed receipt for your records. For larger projects, we can discuss a deposit and payment schedule that works for you.', 4, true),
  ('Do you offer any guarantees?', 'Absolutely. We stand behind our work with a satisfaction guarantee. If something is not right, we will come back and fix it at no additional cost. Your satisfaction is our top priority, and we are not happy until you are. We also offer workmanship warranties on select services — ask us for details when you book.', 5, true),
  ('How often should I clean my gutters?', 'For most homes in the Greater Toronto Area, we recommend gutter cleaning twice a year — once in late spring after the pollen and seed pods fall, and again in late fall after the leaves have dropped. If your property has many trees nearby, you may benefit from quarterly cleaning to prevent blockages and ice damming in winter.', 6, true),
  ('Can you handle commercial properties?', 'Yes. We service both residential and commercial properties across Brampton and the GTA. Whether you need gutter maintenance for a small office building, window cleaning for a retail storefront, or handyman services for a rental property, our team has the experience and equipment to get the job done right.', 7, true)
ON CONFLICT DO NOTHING;

-- ── Seed: gallery ──
INSERT INTO website_gallery (image_url, alt_text, label, display_order, active)
VALUES
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/img-20251115-wa0078-high-87ftzz.jpg?enable-io=true&fit=bounds&width=540&height=540&quality=60', 'Gutter cleaning service', 'Gutter Cleaning', 0, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/1000017143-high.jpg?enable-io=true&enable=upscale&crop=1%3A1%2Coffset-x42&width=800', 'Gutter installation work', 'Gutter Installation', 1, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/1000047774-high.jpg?enable-io=true&enable=upscale&crop=1%3A1&width=800', 'Exterior maintenance project', 'Exterior Maintenance', 2, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/1000050365-high-qf05fe.jpg?enable-io=true&enable=upscale&crop=1%3A1&width=800', 'Window caulking service', 'Window Caulking', 3, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjusrpjxtf/1000019040-standard-5um343.jpg', 'Eavestrough repair work', 'Eavestrough Repair', 4, true),
  ('https://primary.jwwb.nl/public/i/m/n/temp-hwgoxuvggarjxtf/1000017147-standard.jpg', 'Downpipe installation', 'Downpipe Service', 5, true)
ON CONFLICT DO NOTHING;

-- ── Seed: service areas ──
INSERT INTO website_service_areas (name, display_order, active)
VALUES
  ('Brampton', 0, true),
  ('Mississauga', 1, true),
  ('Toronto', 2, true),
  ('Etobicoke', 3, true),
  ('Scarborough', 4, true),
  ('Vaughan', 5, true),
  ('Markham', 6, true),
  ('Caledon', 7, true),
  ('North York', 8, true),
  ('Pickering', 9, true),
  ('Ajax', 10, true),
  ('Milton', 11, true)
ON CONFLICT DO NOTHING;

-- ── Seed: company_settings text columns with current website copy ──
UPDATE company_settings SET
  hero_subheading = 'MASBLING A STAR SERVICES is Brampton''s trusted provider of gutter cleaning, eavestrough repair, window caulking, vent cleaning, leak sealing, and handyman services. Licensed, insured, and serving the entire Greater Toronto Area with a satisfaction guarantee. Book online in minutes and get a free estimate today.',
  about_paragraph_1 = 'MASBLING A STAR SERVICES began with a simple idea fueled by a deep passion for quality exterior maintenance. As a locally owned and operated business based in Brampton, Ontario, we pride ourselves on personal attention and dedication to every detail. Over the past decade, we have helped hundreds of homeowners and businesses across the Greater Toronto Area protect and maintain their properties.',
  about_paragraph_2 = 'Our approach is rooted in quality and integrity, ensuring that everything we do reflects our commitment to excellence. We use professional-grade tools, premium materials, and proven techniques on every job — big or small. We build lasting relationships through transparent communication, fair pricing, and reliable service that our customers can count on.',
  about_paragraph_3 = 'Whether you need a routine gutter cleaning, emergency leak repair, or help with a handyman project around the house, our experienced team is ready to deliver results that exceed your expectations. We are fully licensed and insured, and we stand behind our work with a satisfaction guarantee.',
  cta_subheading = 'Book your service online in minutes and get a free, no-obligation estimate. Fast, easy, and secure — our team is ready to help with all your exterior maintenance needs across Brampton and the GTA.',
  services_intro = 'We offer a full range of exterior maintenance and repair services for residential and commercial properties across Brampton, Mississauga, Toronto, and the Greater Toronto Area. Every job includes a free estimate, professional workmanship, and our satisfaction guarantee.',
  process_intro = 'Getting your project done is easy. From your first call to the final walkthrough, we make the process simple, transparent, and stress-free. Here is how we work from start to finish.',
  gallery_intro = 'Take a look at some of our recent work across Brampton, Mississauga, Toronto, and the Greater Toronto Area. Every project is completed with the same attention to detail and commitment to quality, no matter the size.',
  hours_label = 'Mon – Sat',
  hours_value = '8:00 AM – 6:00 PM'
WHERE id = 1;
