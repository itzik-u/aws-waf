import React from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent
} from '@mui/material';

export default function HomePage() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Hero / Header Section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          backgroundColor: 'primary.dark',
          color: 'white',
          borderRadius: 2,
          p: 4,
          mb: 4
        }}
      >
        {/* (Optional) Hero image on the left or right */}
        {/* 
        <Box
          component="img"
          src="path/to/heroImage.jpg"
          alt="Hero"
          sx={{
            width: { xs: '100%', md: '50%' },
            borderRadius: 2,
            mb: { xs: 2, md: 0 },
            mr: { md: 4 }
          }}
        />
        */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" gutterBottom fontWeight="bold">
            Project Name
          </Typography>
          <Typography variant="h6" gutterBottom>
            Welcome to [Project Name], your one-stop solution for [brief summary].
          </Typography>

          {/* Link to the WAF Tools ("/app") */}
          <Button
            component={Link}
            to="/app"
            variant="contained"
            color="secondary"
            size="large"
            sx={{ mt: 2 }}
          >
            Go to WAF Tools
          </Button>
        </Box>
      </Box>

      {/* Key Features Section */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Key Features
          </Typography>
        <Grid container spacing={4}>
          {/* Repeat a Grid item for each feature */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2
              }}
            >
              {/* 
              <Box
                component="img"
                src="path/to/feature1.png"
                alt="Feature 1"
                sx={{ width: '100%', height: 200, objectFit: 'cover' }}
              />
              */}
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feature One
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  A concise explanation of how Feature One helps users accomplish their goals.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
              {/* 
              <Box
                component="img"
                src="path/to/feature2.png"
                alt="Feature 2"
                sx={{ width: '100%', height: 200, objectFit: 'cover' }}
              />
              */}
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Feature Two
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Another highlight that shows how your solution stands out.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Target Audience or Additional Info */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Who Is This For?
        </Typography>
        <Typography variant="body1" textAlign="center" sx={{ maxWidth: 600, mx: 'auto' }}>
          Whether you’re a [type of user] or [another type of user], [Project Name] offers
          a streamlined experience tailored to your needs.
        </Typography>
      </Box>

      {/* Call-to-Action / Next Steps */}
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h5" gutterBottom>
          Ready to Dive In?
        </Typography>
        <Button variant="contained" size="large">
          Create Your Account
        </Button>
      </Box>
    </Container>
  );
}
