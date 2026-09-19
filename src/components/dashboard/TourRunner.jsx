
import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export default function TourRunner({ user }) {
  const isCreator = user?.role === 'creator';
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;

    const tourKey = `has_seen_tour_${user?.user_id}`;
    if (localStorage.getItem(tourKey)) {
      return;
    }

    // Small delay to let the dashboard render
    const timer = setTimeout(() => {
      hasRun.current = true;

      const stepsCreator = [
        {
          element: '#tour-profile-header',
          popover: {
            title: 'Welcome to Ybex! 👋',
            description: 'This is your dashboard. Start by ensuring your profile is complete to attract premium brands.',
            side: "bottom", align: 'start'
          }
        },
        {
          element: '#tour-stats',
          popover: {
            title: 'Track Performance 📈',
            description: 'Monitor your profile views, brand interest, and total earnings in real-time.',
            side: "bottom", align: 'start'
          }
        },
        {
          element: '[data-testid="tour-nav-campaigns"]',
          popover: {
            title: 'Live Campaigns 🌍',
            description: 'Browse and apply to all live campaigns across the platform here.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="tour-nav-ugc"]',
          popover: {
            title: 'Explore Instant UGC ⚡',
            description: 'Find quick, pre-funded UGC tasks to complete without needing to negotiate.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="tour-nav-deals"]',
          popover: {
            title: 'Manage Ongoing Deals 💼',
            description: 'Track your active applications, current deliverables, and deadlines.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="tour-nav-inbox"]',
          popover: {
            title: 'Inbox & Chat 💬',
            description: 'Communicate directly with brand partners regarding briefs and edits.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="tour-nav-earnings"]',
          popover: {
            title: 'Track Earnings 💰',
            description: 'View your completed payouts, upcoming escrow releases, and manage bank details.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="tour-nav-settings"]',
          popover: {
            title: 'Settings ⚙️',
            description: 'Manage your account preferences, notifications, and profile details.',
            side: "right", align: 'center'
          }
        }
      ];

      const stepsBrand = [
        {
          element: '#tour-profile-header',
          popover: {
            title: 'Welcome to Ybex! 👋',
            description: 'This is your brand dashboard. Manage campaigns and creator partnerships seamlessly.',
            side: "bottom", align: 'start'
          }
        },
        {
          element: '#tour-brand-tasks',
          popover: {
            title: 'Important Actions ⚡',
            description: 'Complete these quick tasks to launch and manage your campaigns effectively.',
            side: "bottom", align: 'start'
          }
        },
        {
          element: '[data-testid="nav-explore-creators"]',
          popover: {
            title: 'Find Creators 🔍',
            description: 'Search through 4M+ trusted creators and invite them directly.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="nav-campaigns"]',
          popover: {
            title: 'Manage Campaigns 📊',
            description: 'Create new campaigns, review creator applications, and track active deliverables.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="tour-nav-brand-inbox"]',
          popover: {
            title: 'Inbox & Chat 💬',
            description: 'Message creators directly, negotiate terms, and provide feedback on drafts.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="tour-nav-escrow"]',
          popover: {
            title: 'Payments 🛡️',
            description: 'Manage your campaign budgets, view escrow holds, and approve final creator payouts safely.',
            side: "right", align: 'center'
          }
        },
        {
          element: '[data-testid="tour-nav-settings"]',
          popover: {
            title: 'Settings ⚙️',
            description: 'Manage your brand profile, team access, and billing preferences.',
            side: "right", align: 'center'
          }
        }
      ];

      const steps = isCreator ? stepsCreator : stepsBrand;
      const validSteps = steps.filter(step => document.querySelector(step.element));

      if (validSteps.length > 0) {
        const driverObj = driver({
          showProgress: true,
          nextBtnText: 'Next',
          prevBtnText: 'Prev',
          doneBtnText: 'Done',
          progressText: '{{current}} of {{total}}',
          popoverClass: 'ybex-tour-theme',
          steps: validSteps,
          onDestroyStarted: () => {
             localStorage.setItem(tourKey, 'true');
             driverObj.destroy();
          }
        });
        driverObj.drive();
      }

    }, 2000);

    return () => clearTimeout(timer);
  }, [user, isCreator]);

  return null;
}
