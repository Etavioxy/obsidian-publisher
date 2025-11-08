use sea_orm::entity::prelude::*;
use strum_macros::EnumIter;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "users")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub username: String,
    pub password: String,
    pub created_at: String,
    pub sites: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter)]
pub enum Relation {}

impl RelationTrait for Relation {
    fn def(&self) -> RelationDef {
        match *self {}
    }
}

#[derive(Copy, Clone, Default, Debug, DeriveActiveModelBehavior)]
pub struct ActiveModelBehavior;
