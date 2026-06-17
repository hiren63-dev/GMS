/**
 * Maya Design System - Figma Plugin Script
 * Run this in Figma's Developer Console or as a plugin to create the complete design file
 *
 * This script creates:
 * - 4 pages (Landing Desktop/Mobile, Calendar Desktop/Mobile)
 * - Color design tokens
 * - Typography system
 * - Landing page sections with proper structure
 * - Calendar page layout with trail visualization
 */

// ============================================================================
// COLORS - 0-1 RGB Range
// ============================================================================
const COLORS = {
  cream: { r: 0.937, g: 0.894, b: 0.824 },    // #EFE4D2
  ink: { r: 0.122, g: 0.098, b: 0.078 },      // #1F1814
  purple: { r: 0.357, g: 0.278, b: 0.878 },   // #5B47E0
  gold: { r: 0.8, g: 0.7, b: 0.2 },           // #CCAA33
  navy: { r: 0.1, g: 0.2, b: 0.4 }            // #1A3366
};

// ============================================================================
// PAGE 1: LANDING PAGE - DESKTOP (1440px)
// ============================================================================
async function createLandingPageDesktop() {
  const page = figma.root.children[0];
  page.name = "Landing Page - Desktop";

  // Set page background
  const background = figma.createFrame();
  background.name = "Canvas Background";
  background.resize(1440, 3600);
  background.fills = [{ type: 'SOLID', color: COLORS.cream }];
  page.appendChild(background);

  let yPosition = 0;

  // 1. HERO SECTION
  const hero = figma.createFrame();
  hero.name = "Hero Section";
  hero.resize(1440, 600);
  hero.y = yPosition;
  hero.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const heroTitle = figma.createText();
  heroTitle.characters = "Maya";
  heroTitle.fontSize = 80;
  heroTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  heroTitle.fills = [{ type: 'SOLID', color: COLORS.ink }];
  heroTitle.textAlignHorizontal = "CENTER";
  hero.appendChild(heroTitle);

  const heroSubtitle = figma.createText();
  heroSubtitle.characters = "Your personal wellness companion";
  heroSubtitle.fontSize = 24;
  heroSubtitle.fontName = { family: "Geist", style: "Regular" };
  heroSubtitle.fills = [{ type: 'SOLID', color: COLORS.ink }];
  heroSubtitle.textAlignHorizontal = "CENTER";
  hero.appendChild(heroSubtitle);

  page.appendChild(hero);
  yPosition += 650;

  // 2. DON'T HAVE TO SECTION
  const dontHave = figma.createFrame();
  dontHave.name = "Don't Have To Section";
  dontHave.resize(1440, 400);
  dontHave.y = yPosition;
  dontHave.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const dontHaveTitle = figma.createText();
  dontHaveTitle.characters = "You don't have to do it alone";
  dontHaveTitle.fontSize = 48;
  dontHaveTitle.fontName = { family: "Instrument Serif", style: "Regular" };
  dontHaveTitle.fills = [{ type: 'SOLID', color: COLORS.ink }];
  dontHaveTitle.textAlignHorizontal = "CENTER";
  dontHave.appendChild(dontHaveTitle);

  page.appendChild(dontHave);
  yPosition += 450;

  // 3. MEET MAYA SECTION
  const meetMaya = figma.createFrame();
  meetMaya.name = "Meet Maya Section";
  meetMaya.resize(1440, 500);
  meetMaya.y = yPosition;
  meetMaya.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const meetTitle = figma.createText();
  meetTitle.characters = "Meet Maya";
  meetTitle.fontSize = 56;
  meetTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  meetTitle.fills = [{ type: 'SOLID', color: COLORS.purple }];
  meetTitle.textAlignHorizontal = "CENTER";
  meetMaya.appendChild(meetTitle);

  const meetDesc = figma.createText();
  meetDesc.characters = "An AI-powered wellness guide designed to support your journey with personalized missions, daily challenges, and community rewards.";
  meetDesc.fontSize = 18;
  meetDesc.fontName = { family: "Geist", style: "Regular" };
  meetDesc.fills = [{ type: 'SOLID', color: COLORS.ink }];
  meetDesc.textAlignHorizontal = "CENTER";
  meetMaya.appendChild(meetDesc);

  page.appendChild(meetMaya);
  yPosition += 550;

  // 4. WHY FEATURES SECTION (3 features)
  const whySection = figma.createFrame();
  whySection.name = "Why Features Section";
  whySection.resize(1440, 500);
  whySection.y = yPosition;
  whySection.fills = [{ type: 'SOLID', color: COLORS.ink }];

  const whyTitle = figma.createText();
  whyTitle.characters = "Why Choose Maya?";
  whyTitle.fontSize = 48;
  whyTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  whyTitle.fills = [{ type: 'SOLID', color: COLORS.cream }];
  whyTitle.textAlignHorizontal = "CENTER";
  whySection.appendChild(whyTitle);

  const features = ["Personalized Missions", "Community Challenges", "AI-Powered Insights"];
  for (let i = 0; i < features.length; i++) {
    const feature = figma.createFrame();
    feature.name = `Feature - ${features[i]}`;
    feature.resize(300, 200);
    feature.x = 70 + i * 380;
    feature.y = 120;
    feature.fills = [{ type: 'SOLID', color: COLORS.purple, opacity: 0.15 }];

    const featureText = figma.createText();
    featureText.characters = features[i];
    featureText.fontSize = 20;
    featureText.fontName = { family: "Geist", style: "Bold" };
    featureText.fills = [{ type: 'SOLID', color: COLORS.cream }];
    feature.appendChild(featureText);

    whySection.appendChild(feature);
  }

  page.appendChild(whySection);
  yPosition += 550;

  // 5. BENEFITS SECTION (3 metrics)
  const benefitsSection = figma.createFrame();
  benefitsSection.name = "Benefits Section";
  benefitsSection.resize(1440, 450);
  benefitsSection.y = yPosition;
  benefitsSection.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const benefitsTitle = figma.createText();
  benefitsTitle.characters = "The Results";
  benefitsTitle.fontSize = 48;
  benefitsTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  benefitsTitle.fills = [{ type: 'SOLID', color: COLORS.ink }];
  benefitsTitle.textAlignHorizontal = "CENTER";
  benefitsSection.appendChild(benefitsTitle);

  const metrics = [
    { value: "92%", label: "Completion Rate" },
    { value: "1.5M+", label: "Missions Completed" },
    { value: "50K+", label: "Active Users" }
  ];

  for (let i = 0; i < metrics.length; i++) {
    const metric = figma.createFrame();
    metric.name = `Metric - ${metrics[i].label}`;
    metric.resize(320, 150);
    metric.x = 60 + i * 380;
    metric.y = 100;
    metric.fills = [{ type: 'SOLID', color: COLORS.purple, opacity: 0.1 }];

    const metricValue = figma.createText();
    metricValue.characters = metrics[i].value;
    metricValue.fontSize = 40;
    metricValue.fontName = { family: "DM Serif Display", style: "Regular" };
    metricValue.fills = [{ type: 'SOLID', color: COLORS.purple }];
    metricValue.textAlignHorizontal = "CENTER";
    metric.appendChild(metricValue);

    const metricLabel = figma.createText();
    metricLabel.characters = metrics[i].label;
    metricLabel.fontSize = 16;
    metricLabel.fontName = { family: "Geist", style: "Regular" };
    metricLabel.fills = [{ type: 'SOLID', color: COLORS.ink }];
    metricLabel.textAlignHorizontal = "CENTER";
    metric.appendChild(metricLabel);

    benefitsSection.appendChild(metric);
  }

  page.appendChild(benefitsSection);
  yPosition += 500;

  // 6. PERKS SECTION (Leaderboard + Prize)
  const perksSection = figma.createFrame();
  perksSection.name = "Perks Section";
  perksSection.resize(1440, 400);
  perksSection.y = yPosition;
  perksSection.fills = [{ type: 'SOLID', color: COLORS.purple }];

  const perksTitle = figma.createText();
  perksTitle.characters = "Earn Rewards";
  perksTitle.fontSize = 48;
  perksTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  perksTitle.fills = [{ type: 'SOLID', color: COLORS.cream }];
  perksTitle.textAlignHorizontal = "CENTER";
  perksSection.appendChild(perksTitle);

  const leaderboard = figma.createFrame();
  leaderboard.name = "Leaderboard Preview";
  leaderboard.resize(400, 200);
  leaderboard.x = 200;
  leaderboard.y = 100;
  leaderboard.fills = [{ type: 'SOLID', color: COLORS.cream, opacity: 0.2 }];
  perksSection.appendChild(leaderboard);

  const prize = figma.createFrame();
  prize.name = "Prize Showcase";
  prize.resize(400, 200);
  prize.x = 840;
  prize.y = 100;
  prize.fills = [{ type: 'SOLID', color: COLORS.gold, opacity: 0.3 }];
  perksSection.appendChild(prize);

  page.appendChild(perksSection);
  yPosition += 450;

  // 7. MARQUEE SECTION
  const marqueeSection = figma.createFrame();
  marqueeSection.name = "Marquee Section";
  marqueeSection.resize(1440, 250);
  marqueeSection.y = yPosition;
  marqueeSection.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const marqueeText = figma.createText();
  marqueeText.characters = "Transform your wellness journey • Join thousands of others • Start your mission today";
  marqueeText.fontSize = 24;
  marqueeText.fontName = { family: "Geist", style: "Regular" };
  marqueeText.fills = [{ type: 'SOLID', color: COLORS.ink }];
  marqueeText.textAlignHorizontal = "CENTER";
  marqueeSection.appendChild(marqueeText);

  page.appendChild(marqueeSection);
  yPosition += 300;

  // 8. MANIFESTO SECTION
  const manifestoSection = figma.createFrame();
  manifestoSection.name = "Manifesto Section";
  manifestoSection.resize(1440, 350);
  manifestoSection.y = yPosition;
  manifestoSection.fills = [{ type: 'SOLID', color: COLORS.ink }];

  const manifestoTitle = figma.createText();
  manifestoTitle.characters = "Our Mission";
  manifestoTitle.fontSize = 48;
  manifestoTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  manifestoTitle.fills = [{ type: 'SOLID', color: COLORS.cream }];
  manifestoTitle.textAlignHorizontal = "CENTER";
  manifestoSection.appendChild(manifestoTitle);

  const manifestoText = figma.createText();
  manifestoText.characters = "We believe that everyone deserves personalized support on their wellness journey. Through AI-powered insights and community engagement, Maya makes wellness accessible, achievable, and rewarding.";
  manifestoText.fontSize = 18;
  manifestoText.fontName = { family: "Geist", style: "Regular" };
  manifestoText.fills = [{ type: 'SOLID', color: COLORS.cream }];
  manifestoText.textAlignHorizontal = "CENTER";
  manifestoSection.appendChild(manifestoText);

  page.appendChild(manifestoSection);
  yPosition += 400;

  // 9. FOOTER SECTION
  const footerSection = figma.createFrame();
  footerSection.name = "Footer Section";
  footerSection.resize(1440, 300);
  footerSection.y = yPosition;
  footerSection.fills = [{ type: 'SOLID', color: COLORS.navy }];

  const footerTitle = figma.createText();
  footerTitle.characters = "Start Your Journey Today";
  footerTitle.fontSize = 40;
  footerTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  footerTitle.fills = [{ type: 'SOLID', color: COLORS.cream }];
  footerTitle.textAlignHorizontal = "CENTER";
  footerSection.appendChild(footerTitle);

  const cta = figma.createFrame();
  cta.name = "CTA Button";
  cta.resize(300, 60);
  cta.x = 570;
  cta.y = 100;
  cta.fills = [{ type: 'SOLID', color: COLORS.purple }];
  footerSection.appendChild(cta);

  const ctaText = figma.createText();
  ctaText.characters = "Get Started";
  ctaText.fontSize = 18;
  ctaText.fontName = { family: "Geist", style: "Bold" };
  ctaText.fills = [{ type: 'SOLID', color: COLORS.cream }];
  ctaText.textAlignHorizontal = "CENTER";
  cta.appendChild(ctaText);

  page.appendChild(footerSection);
}

// ============================================================================
// PAGE 2: LANDING PAGE - MOBILE (375px)
// ============================================================================
async function createLandingPageMobile() {
  const page = figma.createPage();
  page.name = "Landing Page - Mobile";

  const background = figma.createFrame();
  background.name = "Canvas Background";
  background.resize(375, 4500);
  background.fills = [{ type: 'SOLID', color: COLORS.cream }];
  page.appendChild(background);

  let yPosition = 0;

  // Similar structure to desktop but optimized for 375px width
  // Each section adapted for mobile layout

  const sections = [
    { name: "Hero Section Mobile", height: 500, bgColor: COLORS.cream },
    { name: "Don't Have To Mobile", height: 300, bgColor: COLORS.cream },
    { name: "Meet Maya Mobile", height: 400, bgColor: COLORS.cream },
    { name: "Why Features Mobile", height: 600, bgColor: COLORS.ink },
    { name: "Benefits Mobile", height: 550, bgColor: COLORS.cream },
    { name: "Perks Mobile", height: 400, bgColor: COLORS.purple },
    { name: "Marquee Mobile", height: 250, bgColor: COLORS.cream },
    { name: "Manifesto Mobile", height: 350, bgColor: COLORS.ink },
    { name: "Footer Mobile", height: 300, bgColor: COLORS.navy }
  ];

  for (const section of sections) {
    const frame = figma.createFrame();
    frame.name = section.name;
    frame.resize(375, section.height);
    frame.y = yPosition;
    frame.fills = [{ type: 'SOLID', color: section.bgColor }];

    const title = figma.createText();
    title.characters = section.name.replace(" Mobile", "");
    title.fontSize = 28;
    title.fontName = { family: "DM Serif Display", style: "Regular" };
    title.fills = [{ type: 'SOLID', color: section.bgColor === COLORS.cream || section.bgColor === COLORS.purple ? COLORS.ink : COLORS.cream }];
    title.textAlignHorizontal = "CENTER";
    frame.appendChild(title);

    page.appendChild(frame);
    yPosition += section.height + 20;
  }
}

// ============================================================================
// PAGE 3: CALENDAR PAGE - DESKTOP (1200px)
// ============================================================================
async function createCalendarPageDesktop() {
  const page = figma.createPage();
  page.name = "Calendar - Desktop";

  const background = figma.createFrame();
  background.name = "Canvas Background";
  background.resize(1200, 800);
  background.fills = [{ type: 'SOLID', color: COLORS.cream }];
  page.appendChild(background);

  // Left panel - Trail Map
  const trailPanel = figma.createFrame();
  trailPanel.name = "Trail Map Panel";
  trailPanel.resize(600, 800);
  trailPanel.x = 0;
  trailPanel.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const trailTitle = figma.createText();
  trailTitle.characters = "Your Trail";
  trailTitle.fontSize = 32;
  trailTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  trailTitle.fills = [{ type: 'SOLID', color: COLORS.ink }];
  trailPanel.appendChild(trailTitle);

  // Trail visualization with nodes
  for (let i = 0; i < 7; i++) {
    const node = figma.createEllipse();
    node.name = `Day ${i + 1} Node`;
    node.resize(40, 40);
    node.x = 100 + i * 70;
    node.y = 150;
    node.fills = [{
      type: 'SOLID',
      color: i === 0 ? COLORS.purple : COLORS.gold
    }];
    trailPanel.appendChild(node);
  }

  page.appendChild(trailPanel);

  // Right panel - Mission Cards
  const cardsPanel = figma.createFrame();
  cardsPanel.name = "Mission Cards Panel";
  cardsPanel.resize(600, 800);
  cardsPanel.x = 600;
  cardsPanel.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const cardsTitle = figma.createText();
  cardsTitle.characters = "Today's Missions";
  cardsTitle.fontSize = 32;
  cardsTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  cardsTitle.fills = [{ type: 'SOLID', color: COLORS.ink }];
  cardsPanel.appendChild(cardsTitle);

  const missions = ["Morning Meditation", "Hydration Challenge", "Evening Reflection"];
  for (let i = 0; i < missions.length; i++) {
    const card = figma.createFrame();
    card.name = `Mission Card - ${missions[i]}`;
    card.resize(500, 100);
    card.x = 50;
    card.y = 100 + i * 150;
    card.fills = [{ type: 'SOLID', color: COLORS.purple, opacity: 0.15 }];

    const missionText = figma.createText();
    missionText.characters = missions[i];
    missionText.fontSize = 18;
    missionText.fontName = { family: "Geist", style: "Bold" };
    missionText.fills = [{ type: 'SOLID', color: COLORS.ink }];
    card.appendChild(missionText);

    cardsPanel.appendChild(card);
  }

  page.appendChild(cardsPanel);
}

// ============================================================================
// PAGE 4: CALENDAR PAGE - MOBILE (375px)
// ============================================================================
async function createCalendarPageMobile() {
  const page = figma.createPage();
  page.name = "Calendar - Mobile";

  const background = figma.createFrame();
  background.name = "Canvas Background";
  background.resize(375, 1200);
  background.fills = [{ type: 'SOLID', color: COLORS.cream }];
  page.appendChild(background);

  // Trail Map Section
  const trailSection = figma.createFrame();
  trailSection.name = "Trail Map Mobile";
  trailSection.resize(375, 400);
  trailSection.y = 0;
  trailSection.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const trailTitle = figma.createText();
  trailTitle.characters = "Your Trail";
  trailTitle.fontSize = 24;
  trailTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  trailTitle.fills = [{ type: 'SOLID', color: COLORS.ink }];
  trailSection.appendChild(trailTitle);

  // Day nodes for mobile
  for (let i = 0; i < 5; i++) {
    const node = figma.createEllipse();
    node.name = `Day ${i + 1} Mobile Node`;
    node.resize(35, 35);
    node.x = 50 + i * 60;
    node.y = 80;
    node.fills = [{
      type: 'SOLID',
      color: i === 0 ? COLORS.purple : COLORS.gold
    }];
    trailSection.appendChild(node);
  }

  page.appendChild(trailSection);

  // Missions Section
  const missionsSection = figma.createFrame();
  missionsSection.name = "Missions Mobile";
  missionsSection.resize(375, 350);
  missionsSection.y = 420;
  missionsSection.fills = [{ type: 'SOLID', color: COLORS.cream }];

  const missionsTitle = figma.createText();
  missionsTitle.characters = "Today's Missions";
  missionsTitle.fontSize = 20;
  missionsTitle.fontName = { family: "DM Serif Display", style: "Regular" };
  missionsTitle.fills = [{ type: 'SOLID', color: COLORS.ink }];
  missionsSection.appendChild(missionsTitle);

  const missionCards = ["Morning Meditation", "Hydration Challenge"];
  for (let i = 0; i < missionCards.length; i++) {
    const card = figma.createFrame();
    card.name = `Mobile Mission Card - ${missionCards[i]}`;
    card.resize(330, 70);
    card.x = 22;
    card.y = 60 + i * 100;
    card.fills = [{ type: 'SOLID', color: COLORS.purple, opacity: 0.15 }];
    missionsSection.appendChild(card);
  }

  page.appendChild(missionsSection);

  // Bottom Navigation
  const navBar = figma.createFrame();
  navBar.name = "Bottom Navigation";
  navBar.resize(375, 150);
  navBar.y = 820;
  navBar.fills = [{ type: 'SOLID', color: COLORS.navy }];

  const navItems = ["Home", "Trail", "Leaderboard", "Profile"];
  for (let i = 0; i < navItems.length; i++) {
    const navItem = figma.createText();
    navItem.characters = navItems[i];
    navItem.fontSize = 14;
    navItem.fontName = { family: "Geist", style: "Regular" };
    navItem.fills = [{ type: 'SOLID', color: COLORS.cream }];
    navBar.appendChild(navItem);
  }

  page.appendChild(navBar);

  // Maya Bubble Dialog
  const dialog = figma.createFrame();
  dialog.name = "Maya Bubble Dialog";
  dialog.resize(300, 200);
  dialog.x = 37;
  dialog.y = 1000;
  dialog.fills = [{ type: 'SOLID', color: COLORS.purple }];

  const dialogText = figma.createText();
  dialogText.characters = "Great job today! Keep up the amazing work!";
  dialogText.fontSize = 16;
  dialogText.fontName = { family: "Geist", style: "Regular" };
  dialogText.fills = [{ type: 'SOLID', color: COLORS.cream }];
  dialogText.textAlignHorizontal = "CENTER";
  dialog.appendChild(dialogText);

  page.appendChild(dialog);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
(async () => {
  try {
    // Create all pages
    await createLandingPageDesktop();
    await createLandingPageMobile();
    await createCalendarPageDesktop();
    await createCalendarPageMobile();

    return {
      status: "SUCCESS",
      message: "Maya Design System file created successfully!",
      pages: [
        "Landing Page - Desktop (1440px)",
        "Landing Page - Mobile (375px)",
        "Calendar - Desktop (1200px)",
        "Calendar - Mobile (375px)"
      ],
      colors: ["Cream (#EFE4D2)", "Ink (#1F1814)", "Purple (#5B47E0)", "Gold (#CCAA33)", "Navy (#1A3366)"],
      fonts: ["DM Serif Display", "Geist", "Geist Mono", "Instrument Serif"]
    };
  } catch (error) {
    return {
      status: "ERROR",
      message: error.toString()
    };
  }
})();
