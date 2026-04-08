npx -y vercel env rm MONGODB_URI production --yes --scope thaibins-projects
npx -y vercel env rm CLOUDINARY_CLOUD_NAME production --yes --scope thaibins-projects
npx -y vercel env rm CLOUDINARY_API_KEY production --yes --scope thaibins-projects
npx -y vercel env rm CLOUDINARY_API_SECRET production --yes --scope thaibins-projects

node -e "process.stdout.write('mongodb+srv://v_qr_user:QrManager2026!@cluster0.susnio6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')" | npx -y vercel env add MONGODB_URI production --scope thaibins-projects
node -e "process.stdout.write('dvdtidkei')" | npx -y vercel env add CLOUDINARY_CLOUD_NAME production --scope thaibins-projects
node -e "process.stdout.write('785367525913674')" | npx -y vercel env add CLOUDINARY_API_KEY production --scope thaibins-projects
node -e "process.stdout.write('LpdP0qvs7hKvAijVKmvNDYl5Qq8')" | npx -y vercel env add CLOUDINARY_API_SECRET production --scope thaibins-projects
