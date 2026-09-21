# Jharkhandi Yoddha – Real Login + Supabase v1

This package is connected to the Supabase project `jharkhandi-yoddha`.

## Upload
Upload these files to your GitHub Pages repository:
- index.html
- style.css
- app.js
- README.md

## Included
- Real Supabase email/password signup & login
- Student profile
- Course listing from database
- Course enrollment
- Tests and test attempts/results
- Admin-only course/test creation
- RLS-protected database

## Important
The browser uses only the Supabase publishable key. Never put a Supabase secret/service-role key in these files.

## First admin
New users are students by default. To make your own account the first admin, use the Supabase SQL Editor after you create your account:

UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL');

Replace YOUR_EMAIL with your own login email. Do not give anyone your password or secret key.

## Email confirmation
If Supabase requires email confirmation, verify the signup email before logging in.

## Next phase
- Better admin UI
- Lesson/video/PDF management
- Student management
- Payment verification
- Protected paid-course content
