const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Google Ads API統合用のFirebase Functions
 * Google Ads APIのOAuth 2.0認証とキャンペーン管理機能を提供
 */

// Google OAuth 2.0トークンリフレッシュ
exports.refreshGoogleAdsToken = functions.https.onCall(async (data, context) => {
  try {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const { refreshToken, clientId, clientSecret } = data;
    
    if (!refreshToken || !clientId || !clientSecret) {
      throw new functions.https.HttpsError('invalid-argument', '必要なOAuth認証情報が不足しています');
    }

    // Google OAuth 2.0トークンリフレッシュ
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new functions.https.HttpsError('internal', `OAuth token refresh failed: ${errorData.error_description || response.statusText}`);
    }

    const tokenData = await response.json();
    
    // Firestore にトークン情報を保存（暗号化して）
    const userId = context.auth.uid;
    const tokenRef = admin.firestore().collection('googleAdsTokens').doc(userId);
    
    await tokenRef.set({
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type || 'Bearer',
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + (tokenData.expires_in * 1000)),
      refreshedAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: userId
    }, { merge: true });

    console.log('✅ Google Ads API トークンリフレッシュ成功:', userId);
    
    return {
      success: true,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
      message: 'Google Ads API トークンをリフレッシュしました'
    };

  } catch (error) {
    console.error('❌ Google Ads API トークンリフレッシュエラー:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `トークンリフレッシュエラー: ${error.message}`);
  }
});

// Google Ads API キャンペーン作成
exports.createGoogleAdsCampaign = functions.https.onCall(async (data, context) => {
  try {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const { campaignType, config, customerId } = data;
    
    if (!campaignType || !config || !customerId) {
      throw new functions.https.HttpsError('invalid-argument', '必要なキャンペーン情報が不足しています');
    }

    const userId = context.auth.uid;
    
    // アクセストークンを取得
    const tokenDoc = await admin.firestore().collection('googleAdsTokens').doc(userId).get();
    if (!tokenDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Google Ads API 認証情報が見つかりません');
    }

    const tokenData = tokenDoc.data();
    const accessToken = tokenData.accessToken;

    // Google Ads API リクエスト
    let campaignData;
    let endpoint;

    if (campaignType === 'PERFORMANCE_MAX') {
      campaignData = {
        campaign: {
          name: config.name,
          advertisingChannelType: 'PERFORMANCE_MAX',
          status: 'ENABLED',
          campaignBudget: `customers/${customerId}/campaignBudgets/${config.budgetId}`,
          biddingStrategyType: config.biddingStrategy || 'MAXIMIZE_CONVERSIONS',
          ...config.additionalSettings
        }
      };
    } else if (campaignType === 'DEMAND_GEN') {
      campaignData = {
        campaign: {
          name: config.name,
          advertisingChannelType: 'DEMAND_GEN',
          status: 'ENABLED',
          campaignBudget: `customers/${customerId}/campaignBudgets/${config.budgetId}`,
          biddingStrategyType: config.biddingStrategy || 'MAXIMIZE_CONVERSIONS',
          ...config.additionalSettings
        }
      };
    } else {
      throw new functions.https.HttpsError('invalid-argument', `サポートされていないキャンペーンタイプ: ${campaignType}`);
    }

    endpoint = `customers/${customerId}/campaigns:mutate`;

    const response = await fetch(`https://googleads.googleapis.com/v16/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operations: [{
          create: campaignData.campaign
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new functions.https.HttpsError('internal', `Google Ads API エラー: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const campaignId = result.results[0]?.resourceName;

    // キャンペーン情報をFirestoreに保存
    const campaignRef = admin.firestore().collection('googleAdsCampaigns').doc();
    await campaignRef.set({
      userId: userId,
      campaignId: campaignId,
      campaignType: campaignType,
      name: config.name,
      status: 'ENABLED',
      customerId: customerId,
      config: config,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Google Ads キャンペーン作成成功:', campaignId);
    
    return {
      success: true,
      campaignId: campaignId,
      firestoreId: campaignRef.id,
      message: `${campaignType} キャンペーンを作成しました`
    };

  } catch (error) {
    console.error('❌ Google Ads キャンペーン作成エラー:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `キャンペーン作成エラー: ${error.message}`);
  }
});

// Google Ads キャンペーン一覧取得
exports.getGoogleAdsCampaigns = functions.https.onCall(async (data, context) => {
  try {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const { customerId } = data;
    
    if (!customerId) {
      throw new functions.https.HttpsError('invalid-argument', 'Customer IDが必要です');
    }

    const userId = context.auth.uid;
    
    // アクセストークンを取得
    const tokenDoc = await admin.firestore().collection('googleAdsTokens').doc(userId).get();
    if (!tokenDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Google Ads API 認証情報が見つかりません');
    }

    const tokenData = tokenDoc.data();
    const accessToken = tokenData.accessToken;

    // Google Ads API クエリ
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM campaign 
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.name
    `;

    const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new functions.https.HttpsError('internal', `Google Ads API エラー: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ Google Ads キャンペーン一覧取得成功');
    
    return {
      success: true,
      campaigns: result.results || [],
      message: 'キャンペーン一覧を取得しました'
    };

  } catch (error) {
    console.error('❌ Google Ads キャンペーン一覧取得エラー:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `キャンペーン一覧取得エラー: ${error.message}`);
  }
});

// YouTube Data API チャンネル分析
exports.analyzeYouTubeChannel = functions.https.onCall(async (data, context) => {
  try {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const { channelId, apiKey } = data;
    
    if (!channelId || !apiKey) {
      throw new functions.https.HttpsError('invalid-argument', 'チャンネルIDとAPIキーが必要です');
    }

    const userId = context.auth.uid;

    // チャンネル基本情報を取得
    const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${apiKey}`);
    
    if (!channelResponse.ok) {
      const errorData = await channelResponse.json();
      throw new functions.https.HttpsError('internal', `YouTube Data API エラー: ${errorData.error?.message || channelResponse.statusText}`);
    }

    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      throw new functions.https.HttpsError('not-found', 'チャンネルが見つかりません');
    }

    const channel = channelData.items[0];

    // 最新動画を取得
    const videosResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video&key=${apiKey}`);
    
    if (!videosResponse.ok) {
      const errorData = await videosResponse.json();
      throw new functions.https.HttpsError('internal', `YouTube Data API エラー: ${errorData.error?.message || videosResponse.statusText}`);
    }

    const videosData = await videosResponse.json();
    const videoIds = videosData.items ? videosData.items.map(item => item.id.videoId).join(',') : '';

    // 動画の詳細情報を取得
    let videoDetails = [];
    if (videoIds) {
      const detailsResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`);
      
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        videoDetails = detailsData.items || [];
      }
    }

    // 分析データを計算
    const analysis = {
      channel: {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        publishedAt: channel.snippet.publishedAt,
        thumbnails: channel.snippet.thumbnails,
        statistics: {
          viewCount: parseInt(channel.statistics.viewCount || 0),
          subscriberCount: parseInt(channel.statistics.subscriberCount || 0),
          videoCount: parseInt(channel.statistics.videoCount || 0)
        }
      },
      recentVideos: videoDetails.map(video => ({
        id: video.id,
        title: video.snippet.title,
        publishedAt: video.snippet.publishedAt,
        statistics: {
          viewCount: parseInt(video.statistics.viewCount || 0),
          likeCount: parseInt(video.statistics.likeCount || 0),
          commentCount: parseInt(video.statistics.commentCount || 0)
        }
      })),
      analytics: {
        totalVideosAnalyzed: videoDetails.length,
        averageViews: videoDetails.length > 0 ? Math.round(videoDetails.reduce((sum, video) => sum + parseInt(video.statistics.viewCount || 0), 0) / videoDetails.length) : 0,
        averageLikes: videoDetails.length > 0 ? Math.round(videoDetails.reduce((sum, video) => sum + parseInt(video.statistics.likeCount || 0), 0) / videoDetails.length) : 0,
        averageComments: videoDetails.length > 0 ? Math.round(videoDetails.reduce((sum, video) => sum + parseInt(video.statistics.commentCount || 0), 0) / videoDetails.length) : 0
      }
    };

    // 分析結果をFirestoreに保存
    const analysisRef = admin.firestore().collection('youtubeAnalysis').doc();
    await analysisRef.set({
      userId: userId,
      channelId: channelId,
      analysis: analysis,
      analyzedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ YouTube チャンネル分析完了:', channelId);
    
    return {
      success: true,
      data: analysis,
      firestoreId: analysisRef.id,
      message: 'チャンネル分析を完了しました'
    };

  } catch (error) {
    console.error('❌ YouTube チャンネル分析エラー:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `チャンネル分析エラー: ${error.message}`);
  }
});

// Google Ads API 接続テスト
exports.testGoogleAdsConnection = functions.https.onCall(async (data, context) => {
  try {
    // 認証チェック
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'ユーザー認証が必要です');
    }

    const { customerId } = data;
    
    if (!customerId) {
      throw new functions.https.HttpsError('invalid-argument', 'Customer IDが必要です');
    }

    const userId = context.auth.uid;
    
    // アクセストークンを取得
    const tokenDoc = await admin.firestore().collection('googleAdsTokens').doc(userId).get();
    if (!tokenDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Google Ads API 認証情報が見つかりません');
    }

    const tokenData = tokenDoc.data();
    const accessToken = tokenData.accessToken;

    // Google Ads API 接続テスト
    const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new functions.https.HttpsError('internal', `Google Ads API エラー: ${errorData.error?.message || response.statusText}`);
    }

    const customerInfo = await response.json();

    console.log('✅ Google Ads API 接続テスト成功:', customerId);
    
    return {
      success: true,
      customerInfo: customerInfo,
      message: 'Google Ads API に正常に接続できました'
    };

  } catch (error) {
    console.error('❌ Google Ads API 接続テストエラー:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', `接続テストエラー: ${error.message}`);
  }
});